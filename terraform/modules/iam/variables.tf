variable "project_name" {
  description = "Project name"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "tasks_table_arn" {
  description = "Tasks DynamoDB table ARN"
  type        = string
}

variable "assignments_table_arn" {
  description = "Assignments DynamoDB table ARN"
  type        = string
}
