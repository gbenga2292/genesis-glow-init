# Memory Cleanup Script for Windows PowerShell
# Run this script when experiencing memory issues or build problems

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  DCEL Inventory - Memory Cleanup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Clear npm cache
Write-Host "Step 1: Clearing npm cache..." -ForegroundColor Green
try {
    npm cache clean --force 2>&1 | Out-Null
    Write-Host "  npm cache cleared successfully" -ForegroundColor Green
} catch {
    Write-Host "  Failed to clear npm cache" -ForegroundColor Red
}
Write-Host ""

# Step 2: Remove node_modules
Write-Host "Step 2: Removing node_modules..." -ForegroundColor Green
if (Test-Path "node_modules") {
    try {
        Write-Host "  This may take a few minutes..." -ForegroundColor Yellow
        Remove-Item -Recurse -Force "node_modules" -ErrorAction Stop
        Write-Host "  node_modules removed successfully" -ForegroundColor Green
    } catch {
        Write-Host "  Failed to remove node_modules" -ForegroundColor Red
        Write-Host "  Try closing all applications and running again" -ForegroundColor Yellow
    }
} else {
    Write-Host "  node_modules not found, skipping..." -ForegroundColor Yellow
}
Write-Host ""

# Step 3: Remove package-lock.json
Write-Host "Step 3: Removing package-lock.json..." -ForegroundColor Green
if (Test-Path "package-lock.json") {
    try {
        Remove-Item -Force "package-lock.json" -ErrorAction Stop
        Write-Host "  package-lock.json removed successfully" -ForegroundColor Green
    } catch {
        Write-Host "  Failed to remove package-lock.json" -ForegroundColor Red
    }
} else {
    Write-Host "  package-lock.json not found, skipping..." -ForegroundColor Yellow
}
Write-Host ""

# Step 4: Clear dist folder
Write-Host "Step 4: Clearing dist folder..." -ForegroundColor Green
if (Test-Path "dist") {
    try {
        Remove-Item -Recurse -Force "dist" -ErrorAction Stop
        Write-Host "  dist folder cleared successfully" -ForegroundColor Green
    } catch {
        Write-Host "  Failed to clear dist folder" -ForegroundColor Red
    }
} else {
    Write-Host "  dist folder not found, skipping..." -ForegroundColor Yellow
}
Write-Host ""

# Step 5: Clear Android build cache (if exists)
Write-Host "Step 5: Clearing Android build cache..." -ForegroundColor Green
if (Test-Path "android/build") {
    try {
        Remove-Item -Recurse -Force "android/build" -ErrorAction Stop
        Write-Host "  Android build cache cleared successfully" -ForegroundColor Green
    } catch {
        Write-Host "  Failed to clear Android build cache" -ForegroundColor Red
    }
} else {
    Write-Host "  Android build cache not found, skipping..." -ForegroundColor Yellow
}

if (Test-Path "android/app/build") {
    try {
        Remove-Item -Recurse -Force "android/app/build" -ErrorAction Stop
        Write-Host "  Android app build cache cleared successfully" -ForegroundColor Green
    } catch {
        Write-Host "  Failed to clear Android app build cache" -ForegroundColor Red
    }
}
Write-Host ""

# Step 6: Reinstall dependencies
Write-Host "Step 6: Reinstalling dependencies..." -ForegroundColor Green
Write-Host "  This will take several minutes..." -ForegroundColor Yellow
try {
    npm install
    Write-Host "  Dependencies reinstalled successfully" -ForegroundColor Green
} catch {
    Write-Host "  Failed to reinstall dependencies" -ForegroundColor Red
    Write-Host "  Try running 'npm install' manually" -ForegroundColor Yellow
}
Write-Host ""

# Summary
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Cleanup Complete!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Green
Write-Host "  1. Try running your dev server: npm run dev" -ForegroundColor White
Write-Host "  2. Or build the project: npm run build" -ForegroundColor White
Write-Host ""
Write-Host "If you still experience memory issues:" -ForegroundColor Yellow
Write-Host "  - Check MEMORY_OPTIMIZATION.md for more solutions" -ForegroundColor White
Write-Host "  - Consider increasing memory limit in package.json" -ForegroundColor White
Write-Host "  - Close other applications to free up RAM" -ForegroundColor White
Write-Host ""
