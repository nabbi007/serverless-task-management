terraform {
  required_version = ">= 1.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }
}

provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = {
      Project     = "TaskManagementSystem"
      Environment = var.environment
      ManagedBy   = "Terraform"
      CostCenter  = "Engineering"
      Owner       = "DevOps Team"
    }
  }
}

# Cognito User Pool
module "cognito" {
  source = "./modules/cognito"
  
  project_name      = var.project_name
  environment       = var.environment
  allowed_domains   = var.allowed_email_domains
  callback_urls     = var.cognito_callback_urls
  logout_urls       = var.cognito_logout_urls
}

# DynamoDB Tables
module "dynamodb" {
  source = "./modules/dynamodb"
  
  project_name = var.project_name
  environment  = var.environment
}

# Lambda Layer (shared dependencies)
module "lambda_layer" {
  source = "./modules/lambda-layer"
  
  project_name = var.project_name
  environment  = var.environment
}

# IAM Roles for Lambda
module "iam" {
  source = "./modules/iam"
  
  project_name           = var.project_name
  environment            = var.environment
  tasks_table_arn        = module.dynamodb.tasks_table_arn
  assignments_table_arn  = module.dynamodb.assignments_table_arn
}

# Lambda Functions
module "lambda" {
  source = "./modules/lambda"
  
  project_name              = var.project_name
  environment               = var.environment
  lambda_execution_role_arn = module.iam.lambda_execution_role_arn
  tasks_table_name          = module.dynamodb.tasks_table_name
  assignments_table_name    = module.dynamodb.assignments_table_name
  cognito_user_pool_id      = module.cognito.user_pool_id
  lambda_layer_arn          = module.lambda_layer.layer_arn
  aws_region                = var.aws_region
}

# API Gateway
module "api_gateway" {
  source = "./modules/api-gateway"
  
  project_name          = var.project_name
  environment           = var.environment
  cognito_user_pool_arn = module.cognito.user_pool_arn
  lambda_functions      = module.lambda.function_arns
  aws_region            = var.aws_region
}

