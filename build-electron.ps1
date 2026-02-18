# Electron Build Script for DCEL Inventory
# Run this as Administrator to avoid symlink errors

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  DCEL Inventory - Electron Build" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "⚠️  WARNING: Not running as Administrator!" -ForegroundColor Yellow
    Write-Host "   The build may fail with symlink errors." -ForegroundColor Yellow
    Write-Host "   Consider running PowerShell as Administrator." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Press Enter to continue anyway, or Ctrl+C to cancel..." -ForegroundColor White
    Read-Host
}

# Step 1: Clean electron-builder cache if needed
Write-Host "[1/3] Preparing build environment..." -ForegroundColor Yellow

$cacheDir = "$env:LOCALAPPDATA\electron-builder\Cache\winCodeSign"
if (Test-Path $cacheDir) {
    Write-Host "  Cleaning winCodeSign cache..." -ForegroundColor Gray
    Remove-Item -Recurse -Force $cacheDir -ErrorAction SilentlyContinue
}

# Clean release folder
if (Test-Path "release") {
    Remove-Item -Recurse -Force "release" -ErrorAction SilentlyContinue
    Write-Host "  ✓ Cleaned release folder" -ForegroundColor Green
}

Write-Host ""

# Step 2: Build
Write-Host "[2/3] Building Electron app for Windows..." -ForegroundColor Yellow
Write-Host "  This may take several minutes..." -ForegroundColor Gray
Write-Host ""

npm run electron:build:win

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "  ✗ Build Failed!" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Troubleshooting:" -ForegroundColor Yellow
    Write-Host "  1. Run PowerShell as Administrator" -ForegroundColor White
    Write-Host "  2. OR enable Windows Developer Mode:" -ForegroundColor White
    Write-Host "     Settings → Update & Security → For developers" -ForegroundColor Gray
    Write-Host "  3. Clear cache and retry:" -ForegroundColor White
    Write-Host "     Remove-Item -Recurse $env:LOCALAPPDATA\electron-builder\Cache" -ForegroundColor Gray
    Write-Host ""
    exit 1
}

Write-Host ""

# Step 3: Verify output
Write-Host "[3/3] Verifying build output..." -ForegroundColor Yellow

$exePath = "release/dcel_inventory.exe"
if (Test-Path $exePath) {
    $size = (Get-Item $exePath).Length / 1MB
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  ✅ Build Successful!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "  📦 Output: release/dcel_inventory.exe" -ForegroundColor White
    Write-Host "  📏 Size: $([math]::Round($size, 2)) MB" -ForegroundColor White
    Write-Host ""
    Write-Host "  Double-click the .exe file to run the app!" -ForegroundColor Cyan
} else {
    Write-Host "  ⚠️ Expected output not found at: $exePath" -ForegroundColor Yellow
    Write-Host "  Check the release/ folder for output files." -ForegroundColor White
}

Write-Host ""
