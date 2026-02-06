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

echo ""
echo "✓ All Lambda packages built successfully!"
echo ""
echo "Package sizes:"
ls -lh backend/dist/*.zip
echo ""
echo "You can now run: cd terraform && terraform apply"
