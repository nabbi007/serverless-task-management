output "assignment_topic_arn" {
  description = "Task assignment SNS topic ARN"
  value       = aws_sns_topic.task_assignment.arn
}

output "status_change_topic_arn" {
  description = "Task status change SNS topic ARN"
  value       = aws_sns_topic.task_status_change.arn
}

output "topic_arns" {
  description = "All SNS topic ARNs"
  value       = [
    aws_sns_topic.task_assignment.arn,
    aws_sns_topic.task_status_change.arn
  ]
}
