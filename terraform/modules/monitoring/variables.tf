variable "project_name" {
  description = "Project name"
  type        = string
}

variable "environment" {
  description = "Environment (dev, staging, prod)"
  type        = string
}

variable "lambda_functions" {
  description = "Map of Lambda function names"
  type        = map(string)
}

variable "api_gateway_name" {
  description = "API Gateway name"
  type        = string
}

variable "dynamodb_table_names" {
  description = "List of DynamoDB table names"
  type        = list(string)
}

variable "alert_email" {
  description = "Email address for CloudWatch alarms"
  type        = string
  default     = ""
}
