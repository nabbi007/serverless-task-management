resource "aws_ses_email_identity" "from" {
  count = var.ses_from_email != "" ? 1 : 0
  email = var.ses_from_email
}

resource "aws_ses_email_identity" "recipient" {
  for_each = toset(var.ses_verified_recipient_emails)
  email    = each.value
}
