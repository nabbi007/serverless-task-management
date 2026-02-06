resource "aws_api_gateway_rest_api" "main" {
  name        = "${var.project_name}-${var.environment}-api"
  description = "Task Management System API"
  
  endpoint_configuration {
    types = ["REGIONAL"]
  }
}

# Request Validator
resource "aws_api_gateway_request_validator" "main" {
  name                        = "${var.project_name}-validator"
  rest_api_id                 = aws_api_gateway_rest_api.main.id
  validate_request_body       = true
  validate_request_parameters = true
}

# Request Models
resource "aws_api_gateway_model" "create_task" {
  rest_api_id  = aws_api_gateway_rest_api.main.id
  name         = "CreateTaskModel"
  content_type = "application/json"
  
  schema = jsonencode({
    type = "object"
    required = ["title", "description"]
    properties = {
      title = {
        type      = "string"
        minLength = 1
        maxLength = 200
      }
      description = {
        type      = "string"
        minLength = 1
        maxLength = 2000
      }
      priority = {
        type = "string"
        enum = ["low", "medium", "high"]
      }
      dueDate = {
        type = "string"
        format = "date-time"
      }
    }
  })
}

resource "aws_api_gateway_model" "update_task" {
  rest_api_id  = aws_api_gateway_rest_api.main.id
  name         = "UpdateTaskModel"
  content_type = "application/json"
  
  schema = jsonencode({
    type = "object"
    properties = {
      title = {
        type      = "string"
        minLength = 1
        maxLength = 200
      }
      description = {
        type      = "string"
        minLength = 1
        maxLength = 2000
      }
      status = {
        type = "string"
        enum = ["open", "in-progress", "completed", "closed"]
      }
      priority = {
        type = "string"
        enum = ["low", "medium", "high"]
      }
      dueDate = {
        type = "string"
        format = "date-time"
      }
    }
  })
}

resource "aws_api_gateway_model" "assign_task" {
  rest_api_id  = aws_api_gateway_rest_api.main.id
  name         = "AssignTaskModel"
  content_type = "application/json"
  
  schema = jsonencode({
    type = "object"
    required = ["userIds"]
    properties = {
      userIds = {
        type = "array"
        items = {
          type = "string"
        }
        minItems = 1
      }
    }
  })
}

# Cognito Authorizer
resource "aws_api_gateway_authorizer" "cognito" {
  name            = "cognito-authorizer"
  rest_api_id     = aws_api_gateway_rest_api.main.id
  type            = "COGNITO_USER_POOLS"
  provider_arns   = [var.cognito_user_pool_arn]
  identity_source = "method.request.header.Authorization"
}

# /tasks resource
resource "aws_api_gateway_resource" "tasks" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "tasks"
}

# /tasks/{id} resource
resource "aws_api_gateway_resource" "task_id" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.tasks.id
  path_part   = "{id}"
}

# /tasks/{id}/assign resource
resource "aws_api_gateway_resource" "task_assign" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.task_id.id
  path_part   = "assign"
}

# POST /tasks - Create Task
module "create_task_endpoint" {
  source = "./endpoint"
  
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.tasks.id
  http_method   = "POST"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
  lambda_arn    = var.lambda_functions["create_task"]
  function_name = "create_task"
  aws_region    = var.aws_region
}

# GET /tasks - List Tasks
module "get_tasks_endpoint" {
  source = "./endpoint"
  
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.tasks.id
  http_method   = "GET"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
  lambda_arn    = var.lambda_functions["get_tasks"]
  function_name = "get_tasks"
  aws_region    = var.aws_region
}

# GET /tasks/{id} - Get Task
module "get_task_endpoint" {
  source = "./endpoint"
  
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.task_id.id
  http_method   = "GET"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
  lambda_arn    = var.lambda_functions["get_task"]
  function_name = "get_task"
  aws_region    = var.aws_region
}

# PUT /tasks/{id} - Update Task
module "update_task_endpoint" {
  source = "./endpoint"
  
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.task_id.id
  http_method   = "PUT"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
  lambda_arn    = var.lambda_functions["update_task"]
  function_name = "update_task"
  aws_region    = var.aws_region
}

# DELETE /tasks/{id} - Delete Task
module "delete_task_endpoint" {
  source = "./endpoint"
  
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.task_id.id
  http_method   = "DELETE"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
  lambda_arn    = var.lambda_functions["delete_task"]
  function_name = "delete_task"
  aws_region    = var.aws_region
}

# POST /tasks/{id}/assign - Assign Task
module "assign_task_endpoint" {
  source = "./endpoint"
  
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.task_assign.id
  http_method   = "POST"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
  lambda_arn    = var.lambda_functions["assign_task"]
  function_name = "assign_task"
  aws_region    = var.aws_region
}

# CORS configuration for all resources
module "tasks_cors" {
  source = "./cors"
  
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.tasks.id
}

module "task_id_cors" {
  source = "./cors"
  
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.task_id.id
}

module "task_assign_cors" {
  source = "./cors"
  
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.task_assign.id
}

# Deployment
resource "aws_api_gateway_deployment" "main" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  
  depends_on = [
    module.create_task_endpoint,
    module.get_tasks_endpoint,
    module.get_task_endpoint,
    module.update_task_endpoint,
    module.delete_task_endpoint,
    module.assign_task_endpoint
  ]
  
  lifecycle {
    create_before_destroy = true
  }
}

# Stage
resource "aws_api_gateway_stage" "main" {
  deployment_id = aws_api_gateway_deployment.main.id
  rest_api_id   = aws_api_gateway_rest_api.main.id
  stage_name    = var.environment
  
  xray_tracing_enabled = true
  
  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api_gateway.arn
    format = jsonencode({
      requestId      = "$context.requestId"
      ip             = "$context.identity.sourceIp"
      caller         = "$context.identity.caller"
      user           = "$context.identity.user"
      requestTime    = "$context.requestTime"
      httpMethod     = "$context.httpMethod"
      resourcePath   = "$context.resourcePath"
      status         = "$context.status"
      protocol       = "$context.protocol"
      responseLength = "$context.responseLength"
      integrationLatency = "$context.integrationLatency"
      responseLatency = "$context.responseLatency"
    })
  }
}

# CloudWatch Log Group for API Gateway
resource "aws_cloudwatch_log_group" "api_gateway" {
  name              = "/aws/apigateway/${var.project_name}-${var.environment}"
  retention_in_days = 14
}

# Method Settings for logging and metrics
resource "aws_api_gateway_method_settings" "all" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  stage_name  = aws_api_gateway_stage.main.stage_name
  method_path = "*/*"

  settings {
    logging_level      = "INFO"
    data_trace_enabled = true
    metrics_enabled    = true
  }
}

# Usage Plan
resource "aws_api_gateway_usage_plan" "main" {
  name = "${var.project_name}-${var.environment}-usage-plan"
  
  api_stages {
    api_id = aws_api_gateway_rest_api.main.id
    stage  = aws_api_gateway_stage.main.stage_name
  }
  
  throttle_settings {
    burst_limit = 100
    rate_limit  = 50
  }
  
  quota_settings {
    limit  = 10000
    period = "DAY"
  }
}
