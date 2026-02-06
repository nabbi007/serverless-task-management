#!/bin/bash

# Setup script for Serverless Task Management System
# This script prepares all necessary files before Terraform deployment

set -e  # Exit on error

echo "=========================================="
echo "Serverless Task Management System Setup"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Check prerequisites
echo "Step 1: Checking prerequisites..."
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js is not installed${NC}"
    echo "Please install Node.js 18.x or higher from https://nodejs.org/"
    exit 1
fi
echo -e "${GREEN}✓ Node.js $(node --version) found${NC}"

# Check npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}✗ npm is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ npm $(npm --version) found${NC}"

# Check Terraform
if ! command -v terraform &> /dev/null; then
    echo -e "${RED}✗ Terraform is not installed${NC}"
    echo "Please install Terraform from https://www.terraform.io/downloads"
    exit 1
fi
echo -e "${GREEN}✓ Terraform $(terraform version -json | grep -o '"terraform_version":"[^"]*' | cut -d'"' -f4) found${NC}"

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    echo -e "${YELLOW}⚠ AWS CLI is not installed (optional but recommended)${NC}"
else
    echo -e "${GREEN}✓ AWS CLI $(aws --version | cut -d' ' -f1 | cut -d'/' -f2) found${NC}"
fi

echo ""

# Step 2: Install backend dependencies
echo "Step 2: Installing backend dependencies..."
echo ""

cd backend
if [ ! -d "node_modules" ]; then
    echo "Installing npm packages..."
    npm install
    echo -e "${GREEN}✓ Backend dependencies installed${NC}"
else
    echo -e "${GREEN}✓ Backend dependencies already installed${NC}"
fi
cd ..

echo ""

# Step 3: Build Lambda deployment packages
echo "Step 3: Building Lambda deployment packages..."
echo ""

cd backend

# Create dist directory if it doesn't exist
mkdir -p dist

echo "Building Lambda functions..."
node build.js

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Lambda packages built successfully${NC}"
    echo ""
    echo "Created packages:"
    ls -lh dist/*.zip | awk '{print "  - " $9 " (" $5 ")"}'
else
    echo -e "${RED}✗ Failed to build Lambda packages${NC}"
    exit 1
fi

cd ..

echo ""

# Step 4: Build pre-signup Lambda
echo "Step 4: Building Cognito pre-signup Lambda..."
echo ""

cd terraform/modules/cognito/lambda

# Check if zip command exists
if command -v zip &> /dev/null; then
    zip -q pre-signup.zip pre-signup.js
    echo -e "${GREEN}✓ Pre-signup Lambda packaged${NC}"
elif command -v powershell &> /dev/null; then
    # Windows PowerShell alternative
    powershell -Command "Compress-Archive -Path pre-signup.js -DestinationPath pre-signup.zip -Force"
    echo -e "${GREEN}✓ Pre-signup Lambda packaged (PowerShell)${NC}"
else
    echo -e "${RED}✗ Neither 'zip' nor 'powershell' command found${NC}"
    echo "Please install zip utility or use PowerShell on Windows"
    exit 1
fi

cd ../../../..

echo ""

# Step 5: Install frontend dependencies (optional)
echo "Step 5: Installing frontend dependencies (optional)..."
echo ""

read -p "Do you want to install frontend dependencies now? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    cd frontend
    if [ ! -d "node_modules" ]; then
        echo "Installing npm packages..."
        npm install
        echo -e "${GREEN}✓ Frontend dependencies installed${NC}"
    else
        echo -e "${GREEN}✓ Frontend dependencies already installed${NC}"
    fi
    cd ..
else
    echo -e "${YELLOW}⚠ Skipping frontend dependencies${NC}"
fi

echo ""

# Step 6: Configure Terraform
echo "Step 6: Configuring Terraform..."
echo ""

cd terraform

if [ ! -f "terraform.tfvars" ]; then
    echo "Creating terraform.tfvars from example..."
    cp terraform.tfvars.example terraform.tfvars
    echo -e "${YELLOW}⚠ Please edit terraform/terraform.tfvars with your configuration${NC}"
    echo ""
    echo "Required changes:"
    echo "  1. Set aws_region (e.g., us-east-1)"
    echo "  2. Set project_name"
    echo "  3. Configure allowed_email_domains"
    echo "  4. Set cognito_callback_urls"
    echo "  5. (Optional) Configure Amplify settings"
else
    echo -e "${GREEN}✓ terraform.tfvars already exists${NC}"
fi

cd ..

echo ""

# Step 7: Summary
echo "=========================================="
echo "Setup Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo ""
echo "1. Configure AWS credentials:"
echo "   aws configure"
echo ""
echo "2. Edit terraform/terraform.tfvars with your settings"
echo ""
echo "3. Verify SES email (for notifications):"
echo "   aws ses verify-email-identity --email-address noreply@yourdomain.com"
echo ""
echo "4. Initialize Terraform:"
echo "   cd terraform"
echo "   terraform init"
echo ""
echo "5. Review the deployment plan:"
echo "   terraform plan"
echo ""
echo "6. Deploy infrastructure:"
echo "   terraform apply"
echo ""
echo "7. Create admin user (after deployment):"
echo "   aws cognito-idp admin-add-user-to-group \\"
echo "     --user-pool-id <pool-id> \\"
echo "     --username <email> \\"
echo "     --group-name admin"
echo ""
echo "For detailed instructions, see docs/deployment-guide.md"
echo ""
