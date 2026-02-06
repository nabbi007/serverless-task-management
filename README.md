# Serverless Task Management System

A  serverless task management system built on AWS with RBAC, event-driven architecture, and enterprise security.

## Architecture Overview

### Components
- **Frontend**: React.js on AWS Amplify
- **Authentication**: Amazon Cognito with domain restrictions
- **API Layer**: API Gateway with Cognito authorizer
- **Business Logic**: AWS Lambda (Node.js)
- **Database**: DynamoDB
- **Notifications**: Amazon SNS + SES
- **Infrastructure**: Terraform

### Security Features
- JWT-based authentication
- Role-based access control (Admin/Member)
- Domain-restricted signup (@amalitech.com, @amalitechtraining.org)
- Email verification mandatory
- IAM least privilege policies
- Encrypted data at rest and in transit

## Project Structure

```
serverless-task-management/
├── terraform/                  # Infrastructure as Code
│   ├── modules/
│   │   ├── cognito/
│   │   ├── api-gateway/
│   │   ├── lambda/
│   │   ├── dynamodb/
│   │   ├── sns/
│   │   └── iam/
│   ├── main.tf
│   ├── variables.tf
│   ├── outputs.tf
│   └── terraform.tfvars.example
├── backend/                    # Lambda functions
│   ├── src/
│   │   ├── handlers/
│   │   ├── services/
│   │   ├── middleware/
│   │   └── utils/
│   └── package.json
├── frontend/                   # React application
│   ├── src/
│   │   ├── components/
│   │   ├── services/
│   │   ├── contexts/
│   │   └── pages/
│   └── package.json
├── docs/
│   ├── architecture-diagram.md
│   ├── deployment-guide.md
│   └── testing-plan.md
└── README.md
```

## Quick Start

See [Deployment Guide](docs/deployment-guide.md) for detailed instructions.

## Features

- ✅ Domain-restricted user registration
- ✅ Email verification workflow
- ✅ Role-based access control
- ✅ Task CRUD operations
- ✅ Task assignment management
- ✅ Real-time email notifications
- ✅ Secure API endpoints
- ✅ Event-driven architecture
- ✅ Production-ready infrastructure
