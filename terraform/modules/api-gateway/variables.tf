variable "project_name" {
  description = "Project name"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "cognito_user_pool_arn" {
  description = "Cognito User Pool ARN"
  type        = string
}

variable "lambda_functions" {
  description = "Map of Lambda function ARNs"
  type        = map(string)
}

variable "aws_region" {
  description = "AWS region"
  type        = string
}

