# Android Build Script for DCEL Inventory
# This script builds and syncs only what's needed for Android

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  DCEL Inventory - Android Build" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Clean previous Android assets
Write-Host "[1/4] Cleaning previous Android assets..." -ForegroundColor Yellow
$assetsPath = "android/app/src/main/assets/public"
if (Test-Path $assetsPath) {
    Remove-Item -Recurse -Force $assetsPath -ErrorAction SilentlyContinue
    Write-Host "  ✓ Cleaned $assetsPath" -ForegroundColor Green
}

# Also clean build folder
$buildPath = "android/app/build"
if (Test-Path $buildPath) {
    Remove-Item -Recurse -Force $buildPath -ErrorAction SilentlyContinue
    Write-Host "  ✓ Cleaned $buildPath" -ForegroundColor Green
}

Write-Host ""

# Step 2: Build web app
Write-Host "[2/4] Building web app..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ✗ Build failed!" -ForegroundColor Red
    exit 1
}
Write-Host "  ✓ Web build complete" -ForegroundColor Green
Write-Host ""

# Step 3: Sync to Android
Write-Host "[3/4] Syncing to Android (excluding Electron files)..." -ForegroundColor Yellow
npx cap sync android
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ✗ Sync failed!" -ForegroundColor Red
    exit 1
}
Write-Host "  ✓ Sync complete" -ForegroundColor Green
Write-Host ""

# Step 4: Verify and report
Write-Host "[4/4] Verifying build..." -ForegroundColor Yellow

# Check assets folder size
if (Test-Path $assetsPath) {
    $size = (Get-ChildItem -Recurse $assetsPath | Measure-Object -Property Length -Sum).Sum / 1MB
    Write-Host "  📦 Assets size: $([math]::Round($size, 2)) MB" -ForegroundColor Cyan
    
    # Check for problematic folders
    $electronFolder = Join-Path $assetsPath "electron"
    $nodeModulesFolder = Join-Path $assetsPath "node_modules"
    
    if (Test-Path $electronFolder) {
        Write-Host "  ⚠️ WARNING: electron/ folder found in assets - removing..." -ForegroundColor Yellow
        Remove-Item -Recurse -Force $electronFolder
    }
    
    if (Test-Path $nodeModulesFolder) {
        Write-Host "  ⚠️ WARNING: node_modules/ folder found in assets - removing..." -ForegroundColor Yellow
        Remove-Item -Recurse -Force $nodeModulesFolder
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  ✅ Android Build Ready!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor White
Write-Host "  1. Run: npx cap open android" -ForegroundColor White
Write-Host "  2. In Android Studio: Build → Build APK(s)" -ForegroundColor White
Write-Host "  3. APK location: android/app/build/outputs/apk/debug/" -ForegroundColor White
Write-Host ""
