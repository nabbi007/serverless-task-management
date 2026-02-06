resource "aws_sns_topic" "task_assignment" {
  name              = "${var.project_name}-${var.environment}-task-assignment"
  display_name      = "Task Assignment Notifications"
  delivery_policy   = jsonencode({
    http = {
      defaultHealthyRetryPolicy = {
        minDelayTarget     = 20
        maxDelayTarget     = 20
        numRetries         = 3
        numMaxDelayRetries = 0
        numNoDelayRetries  = 0
        numMinDelayRetries = 0
        backoffFunction    = "linear"
      }
    }
  })
  
  kms_master_key_id = "alias/aws/sns"
}

resource "aws_sns_topic" "task_status_change" {
  name              = "${var.project_name}-${var.environment}-task-status-change"
  display_name      = "Task Status Change Notifications"
  delivery_policy   = jsonencode({
    http = {
      defaultHealthyRetryPolicy = {
        minDelayTarget     = 20
        maxDelayTarget     = 20
        numRetries         = 3
        numMaxDelayRetries = 0
        numNoDelayRetries  = 0
        numMinDelayRetries = 0
        backoffFunction    = "linear"
      }
    }
  })
  
  kms_master_key_id = "alias/aws/sns"
}

# SNS topic policy
resource "aws_sns_topic_policy" "task_assignment" {
  arn = aws_sns_topic.task_assignment.arn
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid    = "AllowLambdaPublish"
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
      Action   = "SNS:Publish"
      Resource = aws_sns_topic.task_assignment.arn
    }]
  })
}

resource "aws_sns_topic_policy" "task_status_change" {
  arn = aws_sns_topic.task_status_change.arn
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid    = "AllowLambdaPublish"
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
      Action   = "SNS:Publish"
      Resource = aws_sns_topic.task_status_change.arn
    }]
  })
}
