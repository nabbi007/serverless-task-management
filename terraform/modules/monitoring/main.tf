data "aws_region" "current" {}

# Dead Letter Queue for failed Lambda invocations
resource "aws_sqs_queue" "lambda_dlq" {
  name                      = "${var.project_name}-${var.environment}-lambda-dlq"
  message_retention_seconds = 1209600 # 14 days
  
  tags = {
    Name        = "${var.project_name}-${var.environment}-lambda-dlq"
    Environment = var.environment
  }
}

# SNS Topic for CloudWatch Alarms (optional)
resource "aws_sns_topic" "alerts" {
  count = var.alert_email != "" ? 1 : 0
  name  = "${var.project_name}-${var.environment}-alerts"
  
  tags = {
    Name        = "${var.project_name}-${var.environment}-alerts"
    Environment = var.environment
  }
}

resource "aws_sns_topic_subscription" "alerts_email" {
  count     = var.alert_email != "" ? 1 : 0
  topic_arn = aws_sns_topic.alerts[0].arn
  protocol  = "email"
  endpoint  = var.alert_email
}

# Lambda Error Alarms
resource "aws_cloudwatch_metric_alarm" "lambda_errors" {
  for_each = var.lambda_functions
  
  alarm_name          = "${var.project_name}-${var.environment}-${each.key}-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = "300"
  statistic           = "Sum"
  threshold           = "5"
  alarm_description   = "Alert when ${each.key} Lambda errors exceed threshold"
  alarm_actions       = var.alert_email != "" ? [aws_sns_topic.alerts[0].arn] : []
  treat_missing_data  = "notBreaching"
  
  dimensions = {
    FunctionName = each.value
  }
}

# Lambda Throttles Alarms
resource "aws_cloudwatch_metric_alarm" "lambda_throttles" {
  for_each = var.lambda_functions
  
  alarm_name          = "${var.project_name}-${var.environment}-${each.key}-throttles"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "Throttles"
  namespace           = "AWS/Lambda"
  period              = "300"
  statistic           = "Sum"
  threshold           = "5"
  alarm_description   = "Alert when ${each.key} Lambda throttles exceed threshold"
  alarm_actions       = var.alert_email != "" ? [aws_sns_topic.alerts[0].arn] : []
  treat_missing_data  = "notBreaching"
  
  dimensions = {
    FunctionName = each.value
  }
}

# Lambda Duration Alarms (high latency)
resource "aws_cloudwatch_metric_alarm" "lambda_duration" {
  for_each = var.lambda_functions
  
  alarm_name          = "${var.project_name}-${var.environment}-${each.key}-duration"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "Duration"
  namespace           = "AWS/Lambda"
  period              = "300"
  statistic           = "Average"
  threshold           = "5000" # 5 seconds
  alarm_description   = "Alert when ${each.key} Lambda duration is high"
  alarm_actions       = var.alert_email != "" ? [aws_sns_topic.alerts[0].arn] : []
  treat_missing_data  = "notBreaching"
  
  dimensions = {
    FunctionName = each.value
  }
}

# API Gateway 5XX Errors
resource "aws_cloudwatch_metric_alarm" "api_5xx" {
  alarm_name          = "${var.project_name}-${var.environment}-api-5xx-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "5XXError"
  namespace           = "AWS/ApiGateway"
  period              = "300"
  statistic           = "Sum"
  threshold           = "10"
  alarm_description   = "Alert when API Gateway 5XX errors exceed threshold"
  alarm_actions       = var.alert_email != "" ? [aws_sns_topic.alerts[0].arn] : []
  treat_missing_data  = "notBreaching"
  
  dimensions = {
    ApiName = var.api_gateway_name
  }
}

# API Gateway 4XX Errors (high rate indicates client issues)
resource "aws_cloudwatch_metric_alarm" "api_4xx" {
  alarm_name          = "${var.project_name}-${var.environment}-api-4xx-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "4XXError"
  namespace           = "AWS/ApiGateway"
  period              = "300"
  statistic           = "Sum"
  threshold           = "50"
  alarm_description   = "Alert when API Gateway 4XX errors are high"
  alarm_actions       = var.alert_email != "" ? [aws_sns_topic.alerts[0].arn] : []
  treat_missing_data  = "notBreaching"
  
  dimensions = {
    ApiName = var.api_gateway_name
  }
}

# DynamoDB Throttles
resource "aws_cloudwatch_metric_alarm" "dynamodb_throttles" {
  for_each = toset(var.dynamodb_table_names)
  
  alarm_name          = "${var.project_name}-${var.environment}-${each.key}-throttles"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "UserErrors"
  namespace           = "AWS/DynamoDB"
  period              = "300"
  statistic           = "Sum"
  threshold           = "5"
  alarm_description   = "Alert when DynamoDB ${each.key} throttles exceed threshold"
  alarm_actions       = var.alert_email != "" ? [aws_sns_topic.alerts[0].arn] : []
  treat_missing_data  = "notBreaching"
  
  dimensions = {
    TableName = each.value
  }
}

# CloudWatch Dashboard
resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "${var.project_name}-${var.environment}"
  
  dashboard_body = jsonencode({
    widgets = [
      {
        type = "metric"
        x    = 0
        y    = 0
        width = 12
        height = 6
        properties = {
          metrics = [
            for key, name in var.lambda_functions : 
            ["AWS/Lambda", "Invocations", { stat = "Sum", label = key }]
          ]
          period = 300
          stat   = "Sum"
          region = data.aws_region.current.name
          title  = "Lambda Invocations"
          yAxis = {
            left = {
              min = 0
            }
          }
        }
      },
      {
        type = "metric"
        x    = 12
        y    = 0
        width = 12
        height = 6
        properties = {
          metrics = [
            for key, name in var.lambda_functions : 
            ["AWS/Lambda", "Errors", { stat = "Sum", label = key }]
          ]
          period = 300
          stat   = "Sum"
          region = data.aws_region.current.name
          title  = "Lambda Errors"
          yAxis = {
            left = {
              min = 0
            }
          }
        }
      },
      {
        type = "metric"
        x    = 0
        y    = 6
        width = 12
        height = 6
        properties = {
          metrics = [
            for key, name in var.lambda_functions : 
            ["AWS/Lambda", "Duration", { stat = "Average", label = key }]
          ]
          period = 300
          stat   = "Average"
          region = data.aws_region.current.name
          title  = "Lambda Duration (ms)"
          yAxis = {
            left = {
              min = 0
            }
          }
        }
      },
      {
        type = "metric"
        x    = 12
        y    = 6
        width = 12
        height = 6
        properties = {
          metrics = [
            ["AWS/ApiGateway", "Count", { stat = "Sum", label = "Total Requests" }],
            [".", "4XXError", { stat = "Sum", label = "4XX Errors" }],
            [".", "5XXError", { stat = "Sum", label = "5XX Errors" }]
          ]
          period = 300
          stat   = "Sum"
          region = data.aws_region.current.name
          title  = "API Gateway Metrics"
          yAxis = {
            left = {
              min = 0
            }
          }
        }
      },
      {
        type = "metric"
        x    = 0
        y    = 12
        width = 12
        height = 6
        properties = {
          metrics = [
            for table in var.dynamodb_table_names : 
            ["AWS/DynamoDB", "ConsumedReadCapacityUnits", "TableName", table]
          ]
          period = 300
          stat   = "Sum"
          region = data.aws_region.current.name
          title  = "DynamoDB Read Capacity"
          yAxis = {
            left = {
              min = 0
            }
          }
        }
      },
      {
        type = "metric"
        x    = 12
        y    = 12
        width = 12
        height = 6
        properties = {
          metrics = [
            for table in var.dynamodb_table_names : 
            ["AWS/DynamoDB", "ConsumedWriteCapacityUnits", "TableName", table]
          ]
          period = 300
          stat   = "Sum"
          region = data.aws_region.current.name
          title  = "DynamoDB Write Capacity"
          yAxis = {
            left = {
              min = 0
            }
          }
        }
      }
    ]
  })
}
