variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "eu-west-1"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "task-management"
}

variable "allowed_email_domains" {
  description = "Allowed email domains for signup"
  type        = list(string)
  default     = ["amalitech.com", "amalitechtraining.org", "gmail.com"]
}

variable "cognito_callback_urls" {
  description = "Cognito callback URLs"
  type        = list(string)
  default     = ["http://localhost:3000/callback"]
}

variable "cognito_logout_urls" {
  description = "Cognito logout URLs"
  type        = list(string)
  default     = ["http://localhost:3000/"]
}

variable "ses_from_email" {
  description = "Verified SES From email address used for notifications"
  type        = string
  default     = ""
}

variable "ses_verified_recipient_emails" {
  description = "Recipient emails to verify in SES (needed for sandbox sending)"
  type        = list(string)
  default     = []
}

