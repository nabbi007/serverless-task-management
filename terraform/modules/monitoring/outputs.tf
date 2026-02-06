output "dlq_arn" {
  description = "Dead Letter Queue ARN"
  value       = aws_sqs_queue.lambda_dlq.arn
}

output "dlq_url" {
  description = "Dead Letter Queue URL"
  value       = aws_sqs_queue.lambda_dlq.url
}

output "alert_topic_arn" {
  description = "SNS topic ARN for alerts"
  value       = var.alert_email != "" ? aws_sns_topic.alerts[0].arn : ""
}

output "dashboard_url" {
  description = "CloudWatch Dashboard URL"
  value       = "https://console.aws.amazon.com/cloudwatch/home?region=${data.aws_region.current.name}#dashboards:name=${aws_cloudwatch_dashboard.main.dashboard_name}"
}
