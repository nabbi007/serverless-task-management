output "cognito_user_pool_id" {
  description = "Cognito User Pool ID"
  value       = module.cognito.user_pool_id
}

output "cognito_user_pool_client_id" {
  description = "Cognito User Pool Client ID"
  value       = module.cognito.user_pool_client_id
}

output "api_gateway_endpoint" {
  description = "API Gateway endpoint URL"
  value       = module.api_gateway.api_endpoint
}

output "tasks_table_name" {
  description = "DynamoDB Tasks table name"
  value       = module.dynamodb.tasks_table_name
}

output "assignments_table_name" {
  description = "DynamoDB Assignments table name"
  value       = module.dynamodb.assignments_table_name
}

output "lambda_layer_arn" {
  description = "Lambda Layer ARN for shared dependencies"
  value       = module.lambda_layer.layer_arn
}

