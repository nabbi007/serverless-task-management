output "tasks_table_name" {
  description = "Tasks table name"
  value       = aws_dynamodb_table.tasks.name
}

output "tasks_table_arn" {
  description = "Tasks table ARN"
  value       = aws_dynamodb_table.tasks.arn
}

output "tasks_stream_arn" {
  description = "Tasks table stream ARN"
  value       = aws_dynamodb_table.tasks.stream_arn
}

output "assignments_table_name" {
  description = "Assignments table name"
  value       = aws_dynamodb_table.assignments.name
}

output "assignments_table_arn" {
  description = "Assignments table ARN"
  value       = aws_dynamodb_table.assignments.arn
}

output "assignments_stream_arn" {
  description = "Assignments table stream ARN"
  value       = aws_dynamodb_table.assignments.stream_arn
}
