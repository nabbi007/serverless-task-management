variable "project_name" {
  description = "Project name"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "lambda_execution_role_arn" {
  description = "Lambda execution role ARN"
  type        = string
}

variable "tasks_table_name" {
  description = "Tasks table name"
  type        = string
}

variable "assignments_table_name" {
  description = "Assignments table name"
  type        = string
}

variable "cognito_user_pool_id" {
  description = "Cognito User Pool ID"
  type        = string
}

variable "lambda_layer_arn" {
  description = "Lambda layer ARN for shared dependencies"
  type        = string
  default     = ""
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "eu-west-1"
}

variable "ses_from_email" {
  description = "Verified SES From email address used for notifications"
  type        = string
  default     = ""
}

variable "sns_task_assigned_topic_arn" {
  description = "SNS topic ARN for task assignment notifications"
  type        = string
}

variable "sns_task_status_topic_arn" {
  description = "SNS topic ARN for task status change notifications"
  type        = string
}
