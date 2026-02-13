output "function_arns" {
  description = "Lambda function ARNs"
  value = {
    create_task = aws_lambda_function.create_task.arn
    get_tasks   = aws_lambda_function.get_tasks.arn
    get_task    = aws_lambda_function.get_task.arn
    update_task = aws_lambda_function.update_task.arn
    delete_task = aws_lambda_function.delete_task.arn
    assign_task = aws_lambda_function.assign_task.arn
    get_users   = aws_lambda_function.get_users.arn
    stream_processor = aws_lambda_function.stream_processor.arn
    email_formatter  = aws_lambda_function.email_formatter.arn
  }
}

output "function_names" {
  description = "Lambda function names"
  value = {
    create_task = aws_lambda_function.create_task.function_name
    get_tasks   = aws_lambda_function.get_tasks.function_name
    get_task    = aws_lambda_function.get_task.function_name
    update_task = aws_lambda_function.update_task.function_name
    delete_task = aws_lambda_function.delete_task.function_name
    assign_task = aws_lambda_function.assign_task.function_name
    get_users   = aws_lambda_function.get_users.function_name
    stream_processor = aws_lambda_function.stream_processor.function_name
    email_formatter  = aws_lambda_function.email_formatter.function_name
  }
}

output "function_invoke_arns" {
  description = "Lambda function invoke ARNs"
  value = {
    create_task = aws_lambda_function.create_task.invoke_arn
    get_tasks   = aws_lambda_function.get_tasks.invoke_arn
    get_task    = aws_lambda_function.get_task.invoke_arn
    update_task = aws_lambda_function.update_task.invoke_arn
    delete_task = aws_lambda_function.delete_task.invoke_arn
    assign_task = aws_lambda_function.assign_task.invoke_arn
    get_users   = aws_lambda_function.get_users.invoke_arn
    stream_processor = aws_lambda_function.stream_processor.invoke_arn
    email_formatter  = aws_lambda_function.email_formatter.invoke_arn
  }
}
