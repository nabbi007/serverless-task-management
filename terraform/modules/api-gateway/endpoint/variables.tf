variable "rest_api_id" {
  description = "API Gateway REST API ID"
  type        = string
}

variable "resource_id" {
  description = "API Gateway resource ID"
  type        = string
}

variable "http_method" {
  description = "HTTP method (GET, POST, PUT, DELETE)"
  type        = string
}

variable "authorizer_id" {
  description = "API Gateway authorizer ID"
  type        = string
}

variable "lambda_arn" {
  description = "Lambda function ARN"
  type        = string
}

variable "function_name" {
  description = "Lambda function name"
  type        = string
}

variable "aws_region" {
  description = "AWS region"
  type        = string
}
