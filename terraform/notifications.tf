resource "aws_sns_topic" "task_assigned" {
  name = "${var.project_name}-${var.environment}-task-assigned"
}

resource "aws_sns_topic" "task_status_changed" {
  name = "${var.project_name}-${var.environment}-task-status-changed"
}

resource "aws_lambda_event_source_mapping" "assignments_stream" {
  event_source_arn  = module.dynamodb.assignments_stream_arn
  function_name     = module.lambda.function_arns.stream_processor
  starting_position = "LATEST"
  batch_size        = 100
  enabled           = true
}

resource "aws_lambda_event_source_mapping" "tasks_stream" {
  event_source_arn  = module.dynamodb.tasks_stream_arn
  function_name     = module.lambda.function_arns.stream_processor
  starting_position = "LATEST"
  batch_size        = 100
  enabled           = true
}

resource "aws_lambda_permission" "allow_sns_task_assigned" {
  statement_id  = "AllowExecutionFromSNSTaskAssigned"
  action        = "lambda:InvokeFunction"
  function_name = module.lambda.function_names.email_formatter
  principal     = "sns.amazonaws.com"
  source_arn    = aws_sns_topic.task_assigned.arn
}

resource "aws_lambda_permission" "allow_sns_task_status_changed" {
  statement_id  = "AllowExecutionFromSNSTaskStatusChanged"
  action        = "lambda:InvokeFunction"
  function_name = module.lambda.function_names.email_formatter
  principal     = "sns.amazonaws.com"
  source_arn    = aws_sns_topic.task_status_changed.arn
}

resource "aws_sns_topic_subscription" "task_assigned_email_formatter" {
  topic_arn = aws_sns_topic.task_assigned.arn
  protocol  = "lambda"
  endpoint  = module.lambda.function_arns.email_formatter

  depends_on = [aws_lambda_permission.allow_sns_task_assigned]
}

resource "aws_sns_topic_subscription" "task_status_changed_email_formatter" {
  topic_arn = aws_sns_topic.task_status_changed.arn
  protocol  = "lambda"
  endpoint  = module.lambda.function_arns.email_formatter

  depends_on = [aws_lambda_permission.allow_sns_task_status_changed]
}
