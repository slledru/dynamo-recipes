# dynamo-recipes
## My Recipe Box in AWS DynamoDB

Create Table<br>
```
aws dynamodb create-table --table-name myRecipes \
  --attribute-definitions AttributeName=recipe_name,AttributeType=S \
  --key-schema AttributeName=recipe_name,KeyType=HASH \
  --provisioned-throughput ReadCapacityUnits=1,WriteCapacityUnits=1
```

Put Item<br>
```
aws dynamodb put-item --table-name myRecipes --item file://assets/sourdough-pizza.json
```
