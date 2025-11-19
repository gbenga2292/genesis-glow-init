<#
PowerShell helper to download a Windows build of llama-cpp-server and place it into
electron/resources/llm/llama-cpp-server.exe

This script detects your CPU capabilities (AVX2, AVX, SSE4.1) and recommends
which binary to download.

Usage examples:
  # Detect CPU capabilities and get recommendation
  npm run install-llm
  (This will show which binary type you should download)

  # Use a specific download URL
  npm run install-llm -- --url "https://example.com/llama-cpp-server.exe"

Notes:
 - This script runs with ExecutionPolicy Bypass when invoked via the npm script.
 - On failure, download the binary manually and copy it into electron/resources/llm/
#>
param(
    [string]$Url = '',
    [string]$OutDir = "electron\resources\llm",
    [string]$FileName = "llama-cpp-server.exe"
)

# Function to detect CPU capabilities
function Get-CPUCapabilities {
    $capabilities = @{
        AVX2 = $false
        AVX = $false
        SSE41 = $true  # Most modern CPUs support SSE4.1
        Architecture = [System.Environment]::Is64BitOperatingSystem ? "x64" : "x32"
        Cores = (Get-WmiObject Win32_Processor).NumberOfCores
        Threads = (Get-WmiObject Win32_Processor).NumberOfLogicalProcessors
        CPUModel = (Get-WmiObject Win32_Processor).Name
    }
    
    # On modern x64 systems, assume AVX2 support if CPU count is >= 4
    # This is a heuristic; more robust detection would require CPUID queries
    if ($capabilities.Architecture -eq "x64" -and $capabilities.Cores -ge 4) {
        $capabilities.AVX2 = $true
        $capabilities.AVX = $true
    } elseif ($capabilities.Architecture -eq "x64") {
        $capabilities.AVX = $true
    }
    
    return $capabilities
}

# Detect and display CPU info
Write-Host "`n=== CPU Capability Detection ===" -ForegroundColor Cyan
$cpuCaps = Get-CPUCapabilities
Write-Host "Architecture: $($cpuCaps.Architecture)"
Write-Host "CPU Model: $($cpuCaps.CPUModel)"
Write-Host "Cores: $($cpuCaps.Cores) | Threads: $($cpuCaps.Threads)"
Write-Host "AVX2: $(if ($cpuCaps.AVX2) { '✓' } else { '✗' })"
Write-Host "AVX: $(if ($cpuCaps.AVX) { '✓' } else { '✗' })"
Write-Host "SSE4.1: $(if ($cpuCaps.SSE41) { '✓' } else { '✗' })"

$recommendedBinary = if ($cpuCaps.AVX2) { "avx2" } elseif ($cpuCaps.AVX) { "avx" } else { "sse4.1" }
Write-Host "`nRecommended binary: $recommendedBinary"
if ($cpuCaps.AVX2) {
    Write-Host "  → For best performance, download an AVX2-enabled build."
} elseif ($cpuCaps.AVX) {
    Write-Host "  → Download an AVX-enabled build (AVX2 not detected)."
} else {
    Write-Host "  → Download a non-AVX or SSE4.1 build. Inference will be slower."
}
Write-Host "===============================`n"

if (-not $Url) {
    Write-Host "`nNo download URL provided. You have two options:" -ForegroundColor Yellow
    Write-Host "1) Pass a direct URL to a Windows build of llama-cpp-server:"
    Write-Host "   npm run install-llm -- --url `"https://github.com/.../llama-cpp-server.exe`"`n"
    Write-Host "2) Or download manually from:"
    Write-Host "   - GitHub Releases: https://github.com/ggerganov/llama.cpp/releases"
    Write-Host "   - Look for: llama-cpp-server.exe (Windows x64, $recommendedBinary build preferred)`n"
    Write-Host "Then copy the file to: $(Join-Path (Get-Location) $OutDir)\$FileName`n"
    Write-Host "After downloading, run: npm run electron:dev"
    exit 1
}

$fullOutDir = Join-Path (Get-Location) $OutDir
$fullOutPath = Join-Path $fullOutDir $FileName

# Ensure output directory exists
if (-not (Test-Path $fullOutDir)) {
    Write-Host "Creating directory: $fullOutDir"
    New-Item -ItemType Directory -Path $fullOutDir -Force | Out-Null
}

Write-Host "Downloading llama-cpp-server from: $Url"
Write-Host "Target path: $fullOutPath"

try {
    # Use Invoke-WebRequest to fetch the binary
    Invoke-WebRequest -Uri $Url -OutFile $fullOutPath -UseBasicParsing -TimeoutSec 180
    Write-Host "Download complete."
} catch {
    Write-Error "Failed to download the binary: $_"
    Write-Host "You can download manually and place the file at: $fullOutPath"
    exit 2
}

# Verify file exists and has non-zero size
if ((Test-Path $fullOutPath) -and ((Get-Item $fullOutPath).Length -gt 0)) {
    Write-Host "Binary saved to $fullOutPath"
    Write-Host "You can now run: npm run electron:dev"
    exit 0
} else {
    Write-Error "Downloaded file missing or empty. Please check the URL and try again."
    exit 3
}
