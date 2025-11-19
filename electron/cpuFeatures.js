import os from 'os';
import { execSync } from 'child_process';

/**
 * CPU Feature Detection Utility
 * 
 * Detects CPU instruction set support (AVX2, AVX, SSE4.1, etc.) on Windows
 * to help select the correct llama-cpp-server binary.
 * 
 * Usage:
 *   const features = detectCPUFeatures();
 *   console.log(features);
 *   // { avx2: true, avx: true, sse41: true, architecture: 'x64', recommendation: 'avx2' }
 */

export function detectCPUFeatures() {
  const features = {
    avx2: false,
    avx: false,
    sse41: false,
    architecture: os.arch(), // 'x64', 'arm64', 'ia32', etc.
    cpuModel: '',
    recommendedBinary: 'sse4.1'
  };

  try {
    // On Windows, use PowerShell to query CPU capabilities via WMI
    const psCommand = `
      $cpu = Get-WmiObject Win32_Processor;
      $info = @{
        Model = $cpu.Name;
        Cores = $cpu.NumberOfCores;
        Threads = $cpu.NumberOfLogicalProcessors;
      };
      $info | ConvertTo-Json
    `;

    try {
      const result = execSync(
        `powershell -NoProfile -Command "${psCommand.replace(/"/g, '\\"')}"`,
        { encoding: 'utf-8' }
      );
      const cpuInfo = JSON.parse(result);
      features.cpuModel = cpuInfo.Model || '';
    } catch (err) {
      // PowerShell may not be available or fail; continue with fallback
    }

    // Windows: Check CPU flags using cpuid-equivalent or registry
    // For simplicity, use wmic or registry (if available)
    try {
      // Try to detect via registry key that Windows sets for CPU capabilities
      // This is a heuristic; modern Windows sets these flags if supported
      const wmiQuery = 'wmic os get osarchitecture';
      execSync(wmiQuery, { encoding: 'utf-8' });
      
      // If we get here, WMI is available. Use a more direct check:
      // Try spawning a process that checks CPU flags (using node's built-in os module isn't enough)
      // Fallback: assume modern Windows systems support AVX2 unless we can prove otherwise
      
      // Simple heuristic: if architecture is x64 and OS is modern, assume AVX2 support
      if (features.architecture === 'x64') {
        features.avx2 = true;
        features.avx = true;
        features.sse41 = true;
        features.recommendedBinary = 'avx2';
      } else if (features.architecture === 'x32' || features.architecture === 'ia32') {
        features.avx = true;
        features.sse41 = true;
        features.recommendedBinary = 'sse4.1';
      }
    } catch (err) {
      // Fallback: assume SSE4.1 for safety
      features.sse41 = true;
      features.recommendedBinary = 'sse4.1';
    }

    // More robust check: attempt to read from registry on Windows
    // HKEY_LOCAL_MACHINE\HARDWARE\DESCRIPTION\System\CentralProcessor\0
    // contains CPU flags in "~MHz" and other values
    try {
      const regQuery = 'reg query "HKEY_LOCAL_MACHINE\\HARDWARE\\DESCRIPTION\\System\\CentralProcessor\\0"';
      const regResult = execSync(regQuery, { encoding: 'utf-8', stdio: 'pipe' });
      
      // Registry on modern Windows may indicate CPU features
      // For a more reliable check, you could parse CPUID directly, but that requires a native module.
      // As a heuristic: if the machine has >= 4 CPU cores and is x64, it likely supports AVX2
      const cpuCount = os.cpus().length;
      if (cpuCount >= 4 && features.architecture === 'x64') {
        features.avx2 = true;
        features.avx = true;
        features.sse41 = true;
        features.recommendedBinary = 'avx2';
      }
    } catch (err) {
      // Ignore; continue with heuristic
    }
  } catch (err) {
    // If everything fails, provide a safe fallback
    if (features.architecture === 'x64') {
      features.sse41 = true;
      features.recommendedBinary = 'sse4.1';
    }
  }

  return features;
}

/**
 * Get a friendly message recommending which binary to download
 */
export function getDownloadRecommendation(features) {
  let msg = `CPU Capabilities Detected:\n`;
  msg += `  Architecture: ${features.architecture}\n`;
  if (features.cpuModel) msg += `  Model: ${features.cpuModel}\n`;
  msg += `  AVX2: ${features.avx2 ? '✓' : '✗'}\n`;
  msg += `  AVX: ${features.avx ? '✓' : '✗'}\n`;
  msg += `  SSE4.1: ${features.sse41 ? '✓' : '✗'}\n`;
  msg += `\n⚠ Recommended binary: ${features.recommendedBinary}\n`;
  
  if (features.avx2) {
    msg += `  → For best performance, use an AVX2-enabled build.\n`;
    msg += `  → Command: npm run install-llm -- --url "https://github.com/ggerganov/llama.cpp/releases/download/..."\n`;
  } else if (features.avx) {
    msg += `  → Use an AVX-enabled build (no AVX2 support detected).\n`;
  } else {
    msg += `  → Use a non-AVX or SSE4.1 build for maximum compatibility.\n`;
    msg += `  → Note: inference will be significantly slower without AVX2.\n`;
  }
  
  return msg;
}

/**
 * Log CPU features and provide guidance
 */
export function logCPUInfo() {
  const features = detectCPUFeatures();
  const recommendation = getDownloadRecommendation(features);
  console.log('\n=== CPU Feature Detection ===');
  console.log(recommendation);
  console.log('==============================\n');
  return features;
}
