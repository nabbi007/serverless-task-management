#!/bin/bash
# Run this before terraform apply

echo "Building Lambda packages (optimized)..."

# Build backend Lambda functions
echo ""
echo "1. Installing backend dependencies..."
cd backend
npm install

echo ""
echo "2. Building Lambda packages (handlers only)..."
node build.js

echo ""
echo "3. Building Lambda layer (dependencies)..."
node build-layer.js

cd ..

# Build pre-signup Lambda
echo ""
echo "4. Building pre-signup Lambda..."
cd terraform/modules/cognito/lambda
zip -q pre-signup.zip pre-signup.js
cd ../../../..

# Create lambda-packages directory if it doesn't exist
echo ""
echo "5. Copying packages to terraform/lambda-packages..."
mkdir -p terraform/lambda-packages

# Copy all Lambda function packages
cp backend/dist/*.zip terraform/lambda-packages/

# Copy pre-signup Lambda
cp terraform/modules/cognito/lambda/pre-signup.zip terraform/lambda-packages/

echo ""
echo "✓ All Lambda packages built and copied successfully!"
echo ""
echo "Package sizes:"
ls -lh terraform/lambda-packages/*.zip
echo ""
echo "You can now run: cd terraform && terraform apply"
