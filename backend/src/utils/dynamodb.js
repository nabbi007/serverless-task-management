const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { 
  DynamoDBDocumentClient, 
  GetCommand, 
  PutCommand, 
  UpdateCommand, 
  DeleteCommand, 
  QueryCommand, 
  ScanCommand
} = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const getItem = async (tableName, key) => {
  const command = new GetCommand({
    TableName: tableName,
    Key: key
  });
  
  const response = await docClient.send(command);
  return response.Item;
};

const putItem = async (tableName, item) => {
  const command = new PutCommand({
    TableName: tableName,
    Item: item
  });
  
  await docClient.send(command);
  return item;
};

const updateItem = async (tableName, key, updateExpression, expressionAttributeValues, expressionAttributeNames = {}) => {
  const params = {
    TableName: tableName,
    Key: key,
    UpdateExpression: updateExpression,
    ExpressionAttributeValues: expressionAttributeValues,
    ReturnValues: 'ALL_NEW'
  };
  
  if (Object.keys(expressionAttributeNames).length > 0) {
    params.ExpressionAttributeNames = expressionAttributeNames;
  }
  
  const command = new UpdateCommand(params);
  const response = await docClient.send(command);
  return response.Attributes;
};

const deleteItem = async (tableName, key) => {
  const command = new DeleteCommand({
    TableName: tableName,
    Key: key
  });
  
  await docClient.send(command);
};

/**
 * Query with pagination support
 * @param {string} tableName - DynamoDB table name
 * @param {string} keyConditionExpression - Key condition expression
 * @param {object} expressionAttributeValues - Expression attribute values
 * @param {string} indexName - Optional GSI name
 * @param {number} limit - Optional limit (max 100 for cost optimization)
 * @param {object} lastEvaluatedKey - Optional last evaluated key for pagination
 * @returns {object} { items, lastEvaluatedKey }
 */
const query = async (tableName, keyConditionExpression, expressionAttributeValues, indexName = null, limit = null, lastEvaluatedKey = null) => {
  const params = {
    TableName: tableName,
    KeyConditionExpression: keyConditionExpression,
    ExpressionAttributeValues: expressionAttributeValues
  };
  
  if (indexName) {
    params.IndexName = indexName;
  }
  
  // Cost optimization: limit query size
  if (limit) {
    params.Limit = Math.min(limit, 100); // Cap at 100 items
  }
  
  if (lastEvaluatedKey) {
    params.ExclusiveStartKey = lastEvaluatedKey;
  }
  
  const command = new QueryCommand(params);
  const response = await docClient.send(command);
  
  return {
    items: response.Items || [],
    lastEvaluatedKey: response.LastEvaluatedKey
  };
};

/**
 * Scan with pagination support (use sparingly - prefer Query when possible)
 * @param {string} tableName - DynamoDB table name
 * @param {string} filterExpression - Optional filter expression
 * @param {object} expressionAttributeValues - Expression attribute values
 * @param {number} limit - Optional limit (max 50 for cost optimization)
 * @param {object} lastEvaluatedKey - Optional last evaluated key for pagination
 * @returns {object} { items, lastEvaluatedKey }
 */
const scan = async (tableName, filterExpression = null, expressionAttributeValues = null, limit = null, lastEvaluatedKey = null) => {
  const params = {
    TableName: tableName
  };
  
  if (filterExpression) {
    params.FilterExpression = filterExpression;
    params.ExpressionAttributeValues = expressionAttributeValues;
  }
  
  // Cost optimization: limit scan size (scans are expensive!)
  if (limit) {
    params.Limit = Math.min(limit, 50); // Cap at 50 items for scans
  }
  
  if (lastEvaluatedKey) {
    params.ExclusiveStartKey = lastEvaluatedKey;
  }
  
  const command = new ScanCommand(params);
  const response = await docClient.send(command);
  
  return {
    items: response.Items || [],
    lastEvaluatedKey: response.LastEvaluatedKey
  };
};

module.exports = {
  getItem,
  putItem,
  updateItem,
  deleteItem,
  query,
  scan
};
