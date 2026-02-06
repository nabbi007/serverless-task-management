# Quick Lambda Build Script (Optimized with Layers)
# Run this before terraform apply

Write-Host "Building Lambda packages (optimized)..." -ForegroundColor Cyan

# Build backend Lambda functions
Write-Host "`n1. Installing backend dependencies..." -ForegroundColor Yellow
Set-Location backend
npm install

Write-Host "`n2. Building Lambda packages (handlers only)..." -ForegroundColor Yellow
node build.js

Write-Host "`n3. Building Lambda layer (dependencies)..." -ForegroundColor Yellow
node build-layer.js

Set-Location ..

# Build pre-signup Lambda
Write-Host "`n4. Building pre-signup Lambda..." -ForegroundColor Yellow
Set-Location terraform\modules\cognito\lambda
Compress-Archive -Path pre-signup.js -DestinationPath pre-signup.zip -Force
Set-Location ..\..\..\..

# Create lambda-packages directory if it doesn't exist
Write-Host "`n5. Copying packages to terraform/lambda-packages..." -ForegroundColor Yellow
if (-not (Test-Path "terraform\lambda-packages")) {
    New-Item -ItemType Directory -Path "terraform\lambda-packages" | Out-Null
}

# Copy all Lambda function packages
Copy-Item -Path "backend\dist\*.zip" -Destination "terraform\lambda-packages\" -Force

# Copy pre-signup Lambda
Copy-Item -Path "terraform\modules\cognito\lambda\pre-signup.zip" -Destination "terraform\lambda-packages\" -Force

Write-Host "`n✓ All Lambda packages built and copied successfully!" -ForegroundColor Green
Write-Host "`nPackage sizes:" -ForegroundColor Cyan
Get-ChildItem terraform\lambda-packages\*.zip | Format-Table Name, @{Name="Size (KB)";Expression={[math]::Round($_.Length/1KB,2)}}
Write-Host "`nYou can now run: cd terraform && terraform apply" -ForegroundColor Cyan
