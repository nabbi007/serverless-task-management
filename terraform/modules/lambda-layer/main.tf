resource "aws_lambda_layer_version" "dependencies" {
  filename            = "${path.root}/lambda-packages/dependencies-layer.zip"
  layer_name          = "${var.project_name}-${var.environment}-dependencies"
  description         = "Shared dependencies and utilities for Lambda functions"
  compatible_runtimes = ["nodejs18.x"]
  source_code_hash    = filebase64sha256("${path.root}/lambda-packages/dependencies-layer.zip")

  lifecycle {
    create_before_destroy = true
  }
}
