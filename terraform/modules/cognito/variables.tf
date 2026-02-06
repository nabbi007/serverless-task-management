variable "project_name" {
  description = "Project name"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "allowed_domains" {
  description = "Allowed email domains"
  type        = list(string)
}

variable "callback_urls" {
  description = "Callback URLs"
  type        = list(string)
}

variable "logout_urls" {
  description = "Logout URLs"
  type        = list(string)
}
