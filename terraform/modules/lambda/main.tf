# Create Task Lambda
resource "aws_lambda_function" "create_task" {
  filename         = "${path.root}/lambda-packages/create-task.zip"
  function_name    = "${var.project_name}-${var.environment}-create-task"
  role             = var.lambda_execution_role_arn
  handler          = "handlers/createTask.handler"
  runtime          = "nodejs18.x"
  timeout          = 10
  memory_size      = 256
  source_code_hash = filebase64sha256("${path.root}/lambda-packages/create-task.zip")
  layers           = var.lambda_layer_arn != "" ? [var.lambda_layer_arn] : []
  
  environment {
    variables = {
      TASKS_TABLE       = var.tasks_table_name
      ASSIGNMENTS_TABLE = var.assignments_table_name
      USER_POOL_ID      = var.cognito_user_pool_id
    }
  }
  
  tracing_config {
    mode = "Active"
  }
}

# Get Tasks Lambda
resource "aws_lambda_function" "get_tasks" {
  filename         = "${path.root}/lambda-packages/get-tasks.zip"
  function_name    = "${var.project_name}-${var.environment}-get-tasks"
  role             = var.lambda_execution_role_arn
  handler          = "handlers/getTasks.handler"
  runtime          = "nodejs18.x"
  timeout          = 5
  memory_size      = 256
  source_code_hash = filebase64sha256("${path.root}/lambda-packages/get-tasks.zip")
  layers           = var.lambda_layer_arn != "" ? [var.lambda_layer_arn] : []
  
  environment {
    variables = {
      TASKS_TABLE       = var.tasks_table_name
      ASSIGNMENTS_TABLE = var.assignments_table_name
    }
  }
  
  tracing_config {
    mode = "Active"
  }
}

# Get Task by ID Lambda
resource "aws_lambda_function" "get_task" {
  filename         = "${path.root}/lambda-packages/get-task.zip"
  function_name    = "${var.project_name}-${var.environment}-get-task"
  role             = var.lambda_execution_role_arn
  handler          = "handlers/getTask.handler"
  runtime          = "nodejs18.x"
  timeout          = 5
  memory_size      = 256
  source_code_hash = filebase64sha256("${path.root}/lambda-packages/get-task.zip")
  layers           = var.lambda_layer_arn != "" ? [var.lambda_layer_arn] : []
  
  environment {
    variables = {
      TASKS_TABLE       = var.tasks_table_name
      ASSIGNMENTS_TABLE = var.assignments_table_name
    }
  }
  
  tracing_config {
    mode = "Active"
  }
}

# Update Task Lambda
resource "aws_lambda_function" "update_task" {
  filename         = "${path.root}/lambda-packages/update-task.zip"
  function_name    = "${var.project_name}-${var.environment}-update-task"
  role             = var.lambda_execution_role_arn
  handler          = "handlers/updateTask.handler"
  runtime          = "nodejs18.x"
  timeout          = 10
  memory_size      = 256
  source_code_hash = filebase64sha256("${path.root}/lambda-packages/update-task.zip")
  layers           = var.lambda_layer_arn != "" ? [var.lambda_layer_arn] : []
  
  environment {
    variables = {
      TASKS_TABLE       = var.tasks_table_name
      ASSIGNMENTS_TABLE = var.assignments_table_name
      USER_POOL_ID      = var.cognito_user_pool_id
    }
  }
  
  tracing_config {
    mode = "Active"
  }
}

# Delete Task Lambda
resource "aws_lambda_function" "delete_task" {
  filename         = "${path.root}/lambda-packages/delete-task.zip"
  function_name    = "${var.project_name}-${var.environment}-delete-task"
  role             = var.lambda_execution_role_arn
  handler          = "handlers/deleteTask.handler"
  runtime          = "nodejs18.x"
  timeout          = 10
  memory_size      = 256
  source_code_hash = filebase64sha256("${path.root}/lambda-packages/delete-task.zip")
  layers           = var.lambda_layer_arn != "" ? [var.lambda_layer_arn] : []
  
  environment {
    variables = {
      TASKS_TABLE       = var.tasks_table_name
      ASSIGNMENTS_TABLE = var.assignments_table_name
    }
  }
  
  tracing_config {
    mode = "Active"
  }
}

# Assign Task Lambda
resource "aws_lambda_function" "assign_task" {
  filename         = "${path.root}/lambda-packages/assign-task.zip"
  function_name    = "${var.project_name}-${var.environment}-assign-task"
  role             = var.lambda_execution_role_arn
  handler          = "handlers/assignTask.handler"
  runtime          = "nodejs18.x"
  timeout          = 10
  memory_size      = 256
  source_code_hash = filebase64sha256("${path.root}/lambda-packages/assign-task.zip")
  layers           = var.lambda_layer_arn != "" ? [var.lambda_layer_arn] : []
  
  environment {
    variables = {
      TASKS_TABLE       = var.tasks_table_name
      ASSIGNMENTS_TABLE = var.assignments_table_name
      USER_POOL_ID      = var.cognito_user_pool_id
    }
  }
  
  tracing_config {
    mode = "Active"
  }
}

# CloudWatch Log Groups
resource "aws_cloudwatch_log_group" "create_task" {
  name              = "/aws/lambda/${aws_lambda_function.create_task.function_name}"
  retention_in_days = 14
}

resource "aws_cloudwatch_log_group" "get_tasks" {
  name              = "/aws/lambda/${aws_lambda_function.get_tasks.function_name}"
  retention_in_days = 14
}

resource "aws_cloudwatch_log_group" "get_task" {
  name              = "/aws/lambda/${aws_lambda_function.get_task.function_name}"
  retention_in_days = 14
}

resource "aws_cloudwatch_log_group" "update_task" {
  name              = "/aws/lambda/${aws_lambda_function.update_task.function_name}"
  retention_in_days = 14
}

resource "aws_cloudwatch_log_group" "delete_task" {
  name              = "/aws/lambda/${aws_lambda_function.delete_task.function_name}"
  retention_in_days = 14
}

resource "aws_cloudwatch_log_group" "assign_task" {
  name              = "/aws/lambda/${aws_lambda_function.assign_task.function_name}"
  retention_in_days = 14
}
