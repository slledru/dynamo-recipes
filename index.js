'use strict';

const awsSDK = require('aws-sdk');
awsSDK.config.update({region:'us-east-1'});

let db = new awsSDK.DynamoDB();
let Q = require('q');

const appId = 'amzn1.ask.skill.60599463-8550-4170-8f62-b88f0b421d57';
const recipesTable = 'myRecipes';
const docClient = new awsSDK.DynamoDB.DocumentClient();

/**
 * This sample demonstrates a simple skill built with the Amazon Alexa Skills Kit.
 * The Intent Schema, Custom Slots, and Sample Utterances for this skill, as well as
 * testing instructions are located at http://amzn.to/1LzFrj6
 *
 * For additional samples, visit the Alexa Skills Kit Getting Started guide at
 * http://amzn.to/1LGWsLG
 */

// --------------- Helpers that build all of the responses -----------------------

function buildSpeechletResponse(title, output, repromptText, shouldEndSession) {
  return {
    outputSpeech: {
      type: 'PlainText',
      text: output
    },
    card: {
      type: 'Simple',
      title: `SessionSpeechlet - ${title}`,
      content: `SessionSpeechlet - ${output}`
    },
    reprompt: {
      outputSpeech: {
        type: 'PlainText',
        text: repromptText
      }
    },
    shouldEndSession
  };
}

function buildResponse(sessionAttributes, speechletResponse) {
  return {version: '1.0', sessionAttributes, response: speechletResponse};
}

// --------------- Functions that control the skill's behavior -----------------------

function getWelcomeResponse(callback) {
  // If we wanted to initialize the session to have some attributes we could add those here.
  const sessionAttributes = {};
  const cardTitle = 'Welcome';
  const speechOutput = 'Welcome to My Recipe Box. ' + 'Please tell me what do you want to cook?';
  // If the user either does not reply to the welcome message or says something that is not
  // understood, they will be prompted again with this text.
  const repromptText = 'What would you like to cook by saying, ' + 'give me recipe for sourdough pizza';
  const shouldEndSession = false;

  callback(sessionAttributes, buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
}

function handleSessionEndRequest(callback) {
  const cardTitle = 'Session Ended';
  const speechOutput = 'Thank you for trying My Recipe Box. Have a nice day!';
  // Setting this to true ends the session and exits the skill.
  const shouldEndSession = true;

  callback({}, buildSpeechletResponse(cardTitle, speechOutput, null, shouldEndSession));
}

function createFavoriteColorAttributes(favoriteColor) {
  return {favoriteColor};
}

/**
 * Sets the color in the session and prepares the speech to reply to the user.
 */
function getRecipe(intent, session, callback) {
  console.log('getRecipe')
  const cardTitle = intent.name;
  const favoriteColorSlot = intent.slots.Color;
  let repromptText = '';
  let sessionAttributes = {};
  const shouldEndSession = false;
  let speechOutput = '';

  if (favoriteColorSlot) {
    const favoriteColor = favoriteColorSlot.value;
    sessionAttributes = createFavoriteColorAttributes(favoriteColor);
    speechOutput = `I now know your favorite color is ${favoriteColor}. You can ask me ` + "your favorite color by saying, what's my favorite color?";
    repromptText = "You can ask me your favorite color by saying, what's my favorite color?";
  } else {
    speechOutput = "I'm not sure what your favorite color is. Please please try again.";
    repromptText = "I'm not sure what your favorite color is. You can tell me your " + 'favorite color by saying, my favorite color is red';
  }

  callback(sessionAttributes, buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
}

function getAllRecipes(intent, session, callback) {
  const dynamoParams = {
    TableName: recipesTable,
  };
  let repromptText = null;
  const sessionAttributes = {};
  let shouldEndSession = false;
  let speechOutput = '';

  speechOutput = "this is a test";
  repromptText = "what is next"
  speechOutput = 'The following recipes were found: ';

  Q.nfcall(db.scan.bind(db), dynamoParams).done((data) => {
    console.log('Read table succeeded!');

    if (data.Items && data.Items.length) {
      data.Items.forEach((item, i, array) => {
        if (i === array.length - 1) {
          speechOutput += ' and '
        } else if (i > 0) {
          speechOutput += ', '
        }
        speechOutput += `${item.recipe_name.S}`;
      });
    } else
      speechOutput

    console.log('output', speechOutput);

    // Setting repromptText to null signifies that we do not want to reprompt the user.
    // If the user does not respond or says something that is not understood, the session
    // will end.
    callback(sessionAttributes, buildSpeechletResponse(intent.name, speechOutput, repromptText, shouldEndSession));
  });
}

// --------------- Events -----------------------

/**
 * Called when the session starts.
 */
function onSessionStarted(sessionStartedRequest, session) {
  console.log(`onSessionStarted requestId=${sessionStartedRequest.requestId}, sessionId=${session.sessionId}`);
}

/**
 * Called when the user launches the skill without specifying what they want.
 */
function onLaunch(launchRequest, session, callback) {
  console.log(`onLaunch requestId=${launchRequest.requestId}, sessionId=${session.sessionId}`);

  // Dispatch to your skill's launch.
  getWelcomeResponse(callback);
}

/**
 * Called when the user specifies an intent for this skill.
 */
function onIntent(intentRequest, session, callback) {
  console.log(`onIntent requestId=${intentRequest.requestId}, sessionId=${session.sessionId}`);

  const intent = intentRequest.intent;
  const intentName = intentRequest.intent.name;

  console.log('===', intent, intentName)
  console.log(intentRequest);
  // Dispatch to your skill's intent handlers
  if (intentName === 'FindRecipe') {
    getRecipe(intent, session, callback);
  } else if (intentName === 'ListRecipes') {
    getAllRecipes(intent, session, callback);
  } else if (intentName === 'AMAZON.HelpIntent') {
    getWelcomeResponse(callback);
  } else if (intentName === 'AMAZON.StopIntent' || intentName === 'AMAZON.CancelIntent') {
    handleSessionEndRequest(callback);
  } else {
    throw new Error('Invalid intent');
  }
}

/**
 * Called when the user ends the session.
 * Is not called when the skill returns shouldEndSession=true.
 */
function onSessionEnded(sessionEndedRequest, session) {
  console.log(`onSessionEnded requestId=${sessionEndedRequest.requestId}, sessionId=${session.sessionId}`);
  // Add cleanup logic here
}

// --------------- Main handler -----------------------

// Route the incoming request based on type (LaunchRequest, IntentRequest,
// etc.) The JSON body of the request is provided in the event parameter.
exports.handler = (event, context, callback) => {
  try {
    /**
         * Uncomment this if statement and populate with your skill's application ID to
         * prevent someone else from configuring a skill that sends requests to this function.
         */
    /*
            if (event.session.application.applicationId !== 'amzn1.echo-sdk-ams.app.[unique-value-here]') {
                 callback('Invalid Application ID');
            }
            */
    if (event.session.new) {
      onSessionStarted({
        requestId: event.request.requestId
      }, event.session);
    }

    if (event.request.type === 'LaunchRequest') {
      onLaunch(event.request, event.session, (sessionAttributes, speechletResponse) => {
        callback(null, buildResponse(sessionAttributes, speechletResponse));
      });
    } else if (event.request.type === 'IntentRequest') {
      onIntent(event.request, event.session, (sessionAttributes, speechletResponse) => {
        callback(null, buildResponse(sessionAttributes, speechletResponse));
      });
    } else if (event.request.type === 'SessionEndedRequest') {
      onSessionEnded(event.request, event.session);
      callback();
    }
  } catch (err) {
    console.log(err);
    callback(err);
  }
};
