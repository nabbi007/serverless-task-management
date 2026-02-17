# Serverless Task Management System

Serverless task management platform built on AWS with:
- Cognito authentication and role-based access control (Admin/Member)
- API Gateway + Lambda backend
- DynamoDB for tasks and assignments
- Event-driven notifications (DynamoDB Streams -> SNS -> Lambda -> SES)
- Terraform for infrastructure provisioning
- React frontend (local or Amplify-hosted)

## Architecture At A Glance

Frontend:
- React app (`frontend/`)
- Hosted on AWS Amplify (or run locally)

Backend:
- API Gateway (Cognito authorizer)
- Lambda handlers for task CRUD, assignment, and user listing
- DynamoDB tables:
  - `tasks`
  - `assignments`

Notifications:
- DynamoDB Streams trigger `stream-processor`
- `stream-processor` publishes to SNS topics:
  - task assigned
  - task status changed
- `email-formatter` consumes SNS and sends email through SES
- Optional direct SNS email subscriptions are supported as fallback

Auth and Security:
- Cognito User Pool + User Pool Client + Hosted UI domain
- PreSignUp Lambda domain restriction
- Roles/groups (`admin`, `member`)
- IAM least privilege policies
- CloudWatch Logs + X-Ray tracing

Diagram file:
- `architecture.drawio`

## Core Business Rules

- Admin can create/update/delete/assign tasks.
- Member can only view assigned tasks.
- Member can only update task status.
- Assignment supports multiple members.
- Duplicate assignments are prevented.
- Disabled/unconfirmed users cannot be assigned.
- Notifications:
  - On assignment: assigned member(s) and admin recipients
  - On status change: assigned member(s) and admins

## Repository Structure

```text
.
|-- backend/
|   |-- src/
|   |   |-- handlers/
|   |   `-- utils/
|   |-- build.js
|   `-- build-layer.js
|-- frontend/
|   |-- src/
|   |   |-- components/
|   |   |-- contexts/
|   |   |-- pages/
|   |   `-- services/
|   `-- package.json
|-- terraform/
|   |-- modules/
|   |-- main.tf
|   |-- notifications.tf
|   |-- ses.tf
|   |-- variables.tf
|   |-- outputs.tf
|   `-- terraform.tfvars
|-- amplify.yml
|-- build-lambdas.sh
`-- architecture.drawio
```

## Prerequisites

- AWS account/credentials configured (`aws configure`)
- Terraform >= 1.0
- Node.js 18+ (Node.js 20 recommended for long-term support)
- npm
- Git Bash (or equivalent shell for `build-lambdas.sh`)

## Local Frontend Run

1. Install frontend dependencies:
```bash
cd frontend
npm install
```

2. Create/update `frontend/.env` with:
```env
REACT_APP_API_ENDPOINT=<api_gateway_endpoint>
REACT_APP_USER_POOL_ID=<cognito_user_pool_id>
REACT_APP_USER_POOL_CLIENT_ID=<cognito_user_pool_client_id>
REACT_APP_COGNITO_DOMAIN=<cognito_hosted_ui_domain>
REACT_APP_AWS_REGION=eu-west-1
```

3. Run:
```bash
npm start
```

## Build Lambda Packages

From project root:
```bash
./build-lambdas.sh
```

This builds:
- function zips into `backend/dist/`
- dependencies layer zip
- pre-signup lambda zip
- copies all deployable zips into `terraform/lambda-packages/`

## Provision/Update Infrastructure

```bash
cd terraform
terraform init
terraform plan
terraform apply
```

Useful outputs:
```bash
terraform output
```

## Amplify Deployment

Amplify build config is in `amplify.yml`.

Set these Amplify environment variables:
- `REACT_APP_API_ENDPOINT`
- `REACT_APP_USER_POOL_ID`
- `REACT_APP_USER_POOL_CLIENT_ID`
- `REACT_APP_COGNITO_DOMAIN`
- `REACT_APP_AWS_REGION`

`amplify.yml` writes them into `.env.production` during build.

## Notifications Setup Notes

Primary path:
- SES email via `email-formatter` Lambda

Fallback path:
- Generic SNS fallback alerts via `sns_email_subscribers` in `terraform.tfvars`
- Each subscriber is attached to a fallback topic with filter policy on `recipient`
- `email-formatter` publishes fallback alert to SNS only when SES delivery fails

Example:
```hcl
sns_email_subscribers = [
  "illiasu.abubakar@amalitech.com",
  "abraham.gyamfi@amalitech.com"
]
```

After `terraform apply`, each subscriber must confirm SNS subscription by email.

## SES Important Notes

- SES sandbox requires verified recipients.
- `ProductionAccessEnabled` must be true to send to arbitrary recipients.
- `SES_FROM_EMAIL` must be a verified SES identity.
- Corporate inboxes may still quarantine messages (check Exchange/Outlook quarantine and message trace).

## Troubleshooting

No email received:
- Check CloudWatch logs:
  - `/aws/lambda/<project>-<env>-stream-processor`
  - `/aws/lambda/<project>-<env>-email-formatter`
- Confirm SES sender/recipient identity status.
- Confirm SNS subscription status is `Confirmed` (for direct SNS email fallback).

Auth errors:
- Verify frontend env vars match current Terraform outputs.
- Ensure API requests include valid Cognito JWT token.

Task visibility issues:
- Verify user role/group in Cognito.
- Verify assignment records exist in `assignments` table for that user.

## Security Notes

- PreSignUp domain restriction is enforced in Cognito trigger.
- Unauthorized API access is blocked by Cognito authorizer.
- Member permissions are enforced in backend handlers.
- IAM policies are scoped for Lambda execution role.

## Recommended Next Improvements

- Move all Lambdas and layer to Node.js 20 runtime.
- Add CI checks (lint/tests/terraform validate) on pull requests.
- Add domain-level SES DKIM/SPF/DMARC alignment for better deliverability.
