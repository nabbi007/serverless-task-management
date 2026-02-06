resource "aws_cognito_user_pool" "main" {
  name = "${var.project_name}-${var.environment}-user-pool"
  
  # Email configuration
  auto_verified_attributes = ["email"]
  
  username_attributes = ["email"]
  
  # Password policy
  password_policy {
    minimum_length    = 8
    require_lowercase = true
    require_uppercase = true
    require_numbers   = true
    require_symbols   = true
  }
  
  # Email verification
  verification_message_template {
    default_email_option = "CONFIRM_WITH_CODE"
    email_subject        = "Task Management System - Verify your email"
    email_message        = "Your verification code is {####}"
  }
  
  # Account recovery
  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }
  
  # Custom attributes for role
  schema {
    name                = "role"
    attribute_data_type = "String"
    mutable             = true
    
    string_attribute_constraints {
      min_length = 1
      max_length = 20
    }
  }
  
  # Lambda triggers for domain validation
  lambda_config {
    pre_sign_up = aws_lambda_function.pre_signup.arn
  }
  
  # User pool add-ons
  user_pool_add_ons {
    advanced_security_mode = "ENFORCED"
  }
  
  # MFA configuration (optional)
  mfa_configuration = "OPTIONAL"
  
  software_token_mfa_configuration {
    enabled = true
  }
}

# Pre-signup Lambda for domain validation
resource "aws_lambda_function" "pre_signup" {
  filename      = "${path.root}/lambda-packages/pre-signup.zip"
  function_name = "${var.project_name}-${var.environment}-pre-signup"
  role          = aws_iam_role.pre_signup_lambda.arn
  handler       = "pre-signup.handler"
  runtime       = "nodejs18.x"
  timeout       = 10
  source_code_hash = filebase64sha256("${path.root}/lambda-packages/pre-signup.zip")
  
  environment {
    variables = {
      ALLOWED_DOMAINS = join(",", var.allowed_domains)
    }
  }
}

# IAM role for pre-signup Lambda
resource "aws_iam_role" "pre_signup_lambda" {
  name = "${var.project_name}-${var.environment}-pre-signup-role"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "pre_signup_lambda_basic" {
  role       = aws_iam_role.pre_signup_lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Lambda permission for Cognito
resource "aws_lambda_permission" "cognito_pre_signup" {
  statement_id  = "AllowCognitoInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.pre_signup.function_name
  principal     = "cognito-idp.amazonaws.com"
  source_arn    = aws_cognito_user_pool.main.arn
}

# User Pool Client
resource "aws_cognito_user_pool_client" "main" {
  name         = "${var.project_name}-${var.environment}-client"
  user_pool_id = aws_cognito_user_pool.main.id
  
  generate_secret = false
  
  explicit_auth_flows = [
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_USER_PASSWORD_AUTH"
  ]
  
  callback_urls = var.callback_urls
  logout_urls   = var.logout_urls
  
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_flows                  = ["code", "implicit"]
  allowed_oauth_scopes                 = ["email", "openid", "profile"]
  
  supported_identity_providers = ["COGNITO"]
  
  # Token validity
  access_token_validity  = 1  # 1 hour
  id_token_validity      = 1  # 1 hour
  refresh_token_validity = 30 # 30 days
  
  token_validity_units {
    access_token  = "hours"
    id_token      = "hours"
    refresh_token = "days"
  }
  
  prevent_user_existence_errors = "ENABLED"
}

# User Pool Domain
resource "aws_cognito_user_pool_domain" "main" {
  domain       = "${var.project_name}-${var.environment}-${random_string.domain_suffix.result}"
  user_pool_id = aws_cognito_user_pool.main.id
}

resource "random_string" "domain_suffix" {
  length  = 8
  special = false
  upper   = false
}

# Admin group
resource "aws_cognito_user_group" "admin" {
  name         = "admin"
  user_pool_id = aws_cognito_user_pool.main.id
  description  = "Admin users with full access"
  precedence   = 1
}

# Member group
resource "aws_cognito_user_group" "member" {
  name         = "member"
  user_pool_id = aws_cognito_user_pool.main.id
  description  = "Member users with limited access"
  precedence   = 2
}
