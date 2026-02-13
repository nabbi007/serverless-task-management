resource "aws_dynamodb_table" "tasks" {
  name           = "${var.project_name}-${var.environment}-tasks"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "taskId"
  stream_enabled = true
  stream_view_type = "NEW_AND_OLD_IMAGES"
  
  attribute {
    name = "taskId"
    type = "S"
  }
  
  attribute {
    name = "status"
    type = "S"
  }
  
  attribute {
    name = "createdAt"
    type = "S"
  }
  
  # GSI for querying by status
  global_secondary_index {
    name            = "StatusIndex"
    hash_key        = "status"
    range_key       = "createdAt"
    projection_type = "ALL"
  }
  
  # Enable point-in-time recovery
  point_in_time_recovery {
    enabled = true
  }
  
  # Enable encryption at rest
  server_side_encryption {
    enabled = true
  }
  
  # TTL configuration 
  ttl {
    attribute_name = "ttl"
    enabled        = false
  }
  
  tags = {
    Name = "${var.project_name}-${var.environment}-tasks"
  }
}

resource "aws_dynamodb_table" "assignments" {
  name           = "${var.project_name}-${var.environment}-assignments"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "assignmentId"
  stream_enabled = true
  stream_view_type = "NEW_AND_OLD_IMAGES"
  
  attribute {
    name = "assignmentId"
    type = "S"
  }
  
  attribute {
    name = "taskId"
    type = "S"
  }
  
  attribute {
    name = "userId"
    type = "S"
  }
  
  # GSI for querying assignments by task
  global_secondary_index {
    name            = "TaskIndex"
    hash_key        = "taskId"
    projection_type = "ALL"
  }
  
  # GSI for querying assignments by user
  global_secondary_index {
    name            = "UserIndex"
    hash_key        = "userId"
    projection_type = "ALL"
  }
  
  # Enable point-in-time recovery
  point_in_time_recovery {
    enabled = true
  }
  
  # Enable encryption at rest
  server_side_encryption {
    enabled = true
  }
  
  tags = {
    Name = "${var.project_name}-${var.environment}-assignments"
  }
}
