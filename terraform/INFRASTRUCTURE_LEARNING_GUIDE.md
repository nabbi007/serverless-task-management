# Serverless Infrastructure Learning Guide (Terraform)

This guide explains the infrastructure in this project from a **serverless learning** perspective: what each piece does, why it exists, and how requests/events flow end-to-end.

## 1) What "Serverless" Means Here

In this project, "serverless" means:

1. You do not manage EC2 servers.
2. Business logic runs in Lambda functions on demand.
3. Storage is managed by DynamoDB.
4. Authentication is managed by Cognito.
5. API entry point is API Gateway.
6. Notifications are event-driven using DynamoDB Streams + SNS + Lambda + SES.

The design goal is to keep operations low while still enforcing security and role-based behavior.

## 2) Root Terraform Files and Their Purpose

### `terraform/main.tf`
Composes the active modules:

1. `module.cognito`[text](outputs.json)
2. `module.dynamodb`
3. `module.lambda_layer`
4. `module.iam`
5. `module.lambda`
6. `module.api_gateway`

It also wires cross-module dependencies, like:

1. DynamoDB table ARNs into IAM policies.
2. SNS topic ARNs into IAM and Lambda.
3. Cognito pool ARN into API Gateway authorizer.

### `terraform/notifications.tf`
Defines the event pipeline infrastructure:

1. SNS topics:
   1. `task_assigned`
   2. `task_status_changed`
2. DynamoDB Stream event source mappings to `stream-processor` Lambda.
3. SNS -> `email-formatter` Lambda subscriptions.
4. Lambda invoke permissions for SNS.

### `terraform/ses.tf`
Defines SES identities used for sending:

1. `aws_ses_email_identity.from` for sender (`ses_from_email`)
2. `aws_ses_email_identity.recipient` for recipient verification list (useful in SES sandbox)

### `terraform/variables.tf`
Global configuration knobs:

1. Region and environment.
2. Allowed signup domains.
3. Cognito callback/logout URLs.
4. SES sender and verified recipients.

### `terraform/outputs.tf`
Exposes values used by frontend/deployment:

1. Cognito pool/client IDs.
2. API endpoint.
3. Table names.
4. Layer ARN.
5. SES sender identity ARN.

## 3) Module-by-Module Breakdown

## `modules/cognito`

Creates:

1. Cognito User Pool.
2. Pre-signup Lambda trigger for allowed email domain enforcement.
3. User Pool Client with callback/logout URLs.
4. Cognito hosted domain.
5. User groups: `admin`, `member`.

Why:

1. Centralized identity and token issuance.
2. Domain enforcement at signup prevents non-approved emails.
3. Groups/roles support RBAC downstream in Lambda handlers.

Important learning point:

1. `callback_urls` and `logout_urls` are OAuth redirect safelists. They must include your Amplify URL in production.

## `modules/dynamodb`

Creates two tables:

1. `tasks` table
   1. PK: `taskId`
   2. GSI: `StatusIndex` (`status`, `createdAt`)
   3. Streams enabled (`NEW_AND_OLD_IMAGES`)
2. `assignments` table
   1. PK: `assignmentId`
   2. GSIs: `TaskIndex`, `UserIndex`
   3. Streams enabled (`NEW_AND_OLD_IMAGES`)

Why:

1. Split entities for clean many-to-many task assignment modeling.
2. GSIs support lookup patterns without table scans.
3. Streams support asynchronous notification workflows.

## `modules/iam`

Creates Lambda execution role + inline policies:

1. CloudWatch Logs writes.
2. DynamoDB CRUD + stream read permissions.
3. SNS publish permissions (only configured topic ARNs).
4. SES send permissions.
5. Cognito user lookup permissions.

Why:

1. Least-privilege control at infrastructure layer.
2. Keeps function code simple (permissions are pre-wired).

## `modules/lambda-layer`

Creates shared dependency layer (`dependencies-layer.zip`).

Why:

1. Reduces duplication across Lambda packages.
2. Speeds deployment iteration and keeps function zips smaller.

## `modules/lambda`

Creates core functions:

1. `create-task`
2. `get-tasks`
3. `get-task`
4. `update-task`
5. `delete-task`
6. `assign-task`
7. `get-users`
8. `stream-processor`
9. `email-formatter`

Also creates CloudWatch log groups for each function.

Why:

1. Clear separation of responsibilities per handler.
2. Event-handling functions (`stream-processor`, `email-formatter`) are decoupled from API functions.

## `modules/api-gateway`

Creates:

1. REST API and resources:
   1. `/tasks`
   2. `/tasks/{id}`
   3. `/tasks/{id}/assign`
   4. `/users`
2. Cognito authorizer.
3. Method integrations to Lambda (proxy mode).
4. CORS OPTIONS methods via submodule.
5. Stage, access logs, method settings.
6. Usage plan.

Why:

1. Unified, secured API front door.
2. Request/response management and observability at API layer.
3. Cognito authorizer ensures only authenticated calls reach backend.

## 4) End-to-End Infrastructure Flows

## A) Authentication Flow

1. User signs up/signs in through Cognito.
2. Pre-signup Lambda validates email domain.
3. Cognito issues JWT.
4. Frontend sends JWT to API Gateway.
5. API Gateway Cognito authorizer validates token.
6. Valid requests invoke target Lambda.

## B) Task Assignment Notification Flow

1. Admin calls assign/create APIs.
2. Assignment records are written to `assignments` table.
3. DynamoDB Stream emits INSERT event.
4. `stream-processor` reads stream event.
5. `stream-processor` publishes `TASK_ASSIGNED` to SNS `task_assigned`.
6. SNS invokes `email-formatter`.
7. `email-formatter` resolves recipients and sends SES email.

## C) Task Status Change Notification Flow

1. Task status updated in `tasks` table.
2. DynamoDB Stream emits MODIFY event.
3. `stream-processor` detects status transition.
4. Publishes `TASK_STATUS_CHANGED` to SNS `task_status_changed`.
5. SNS invokes `email-formatter`.
6. SES sends status-change notification.

## D) Task Deletion Notification Flow

1. Admin deletes a task.
2. DynamoDB Stream emits REMOVE event from `tasks`.
3. `stream-processor` publishes `TASK_DELETED` to SNS `task_status_changed`.
4. SNS invokes `email-formatter`.
5. `email-formatter` notifies users that were assigned to the deleted task.

## 5) Why This Architecture Is Good for Learning Serverless

1. It demonstrates **sync path vs async path** clearly:
   1. Sync path: API Gateway -> Lambda -> DynamoDB.
   2. Async path: DynamoDB Stream -> Lambda -> SNS -> Lambda -> SES.
2. It demonstrates **event-driven decoupling**:
   1. Task APIs do not wait for email sending.
   2. Notification logic can evolve independently.
3. It demonstrates **managed security boundaries**:
   1. Auth at API Gateway.
   2. Permissions at IAM.
   3. Identity lifecycle in Cognito.
4. It demonstrates **operational visibility**:
   1. CloudWatch logs on API and Lambda.
   2. Centralized infrastructure as code for repeatability.

## 6) Production Notes for This Stack

1. Set `cognito_callback_urls` and `cognito_logout_urls` to your Amplify URL(s).
2. Ensure SES sender identity is verified.
3. If SES account is sandboxed, verify recipients too.
4. Keep Terraform state safe and versioned (remote backend recommended for team use).
5. Rebuild lambda packages before infra apply when handler code changed.

## 7) Current Design Notes / Possible Future Improvements

1. API Gateway request models/validator exist, but request validation is not explicitly attached to methods.
2. API Gateway usage plan exists without API keys attached.
3. `modules/sns` and `modules/monitoring` exist in repo but are not currently instantiated in root `main.tf`.
4. Lambda runtime is Node.js 18; plan migration to Node.js 20.

---

If you are learning from this repo, start by tracing one operation at a time in CloudWatch:

1. Create/assign task.
2. Change status.
3. Delete task.

Then map each log entry to the Terraform resource that made it possible.
