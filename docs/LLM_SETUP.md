# Local LLM Setup Guide

This guide walks you through setting up a local Large Language Model (LLM) for the Launch a Quest AI Assistant. The system runs entirely offline on your PC with no external API calls.

## Overview

**Recommended Setup:**
- **Model:** Mistral 7B (quantized ggml format)
- **Runtime:** llama.cpp (optimized C++ inference engine)
- **Integration:** Native Electron IPC bridge

**Alternatives:**
- HTTP wrapper server (Node.js based) instead of binary spawn
- Other quantized models (Llama 2, Neural Chat, etc.)

---

## Quick Start (Windows)

### Step 1: Download Mistral 7B Model

1. Visit **[Hugging Face - Mistral 7B GGUF](https://huggingface.co/TheBloke/Mistral-7B-Instruct-v0.1-GGUF)** (recommended: TheBloke quantizations)
2. Download the **Q4_K_M quantized version** (recommended for balance):
   - File: `mistral-7b-instruct-v0.1.Q4_K_M.gguf` (~4.4 GB)
   - Direct link: https://huggingface.co/TheBloke/Mistral-7B-Instruct-v0.1-GGUF/resolve/main/mistral-7b-instruct-v0.1.Q4_K_M.gguf

3. Create a `models` folder in your app directory:
   ```
   C:\Users\[YourUsername]\Desktop\assign\launch-a-quest\models\
   ```

4. Save the downloaded file as:
   ```
   C:\Users\[YourUsername]\Desktop\assign\launch-a-quest\models\mistral-7b.gguf
   ```

### Step 2: Download llama.cpp Binary

1. Visit **[llama.cpp Releases](https://github.com/ggerganov/llama.cpp/releases)**
2. Download the **latest Windows release**:
   - File: `llama-b###-bin-win-avx2.zip` or similar
   - Or `llama-b###-bin-win-avx512.zip` if your CPU supports AVX-512 (faster)

3. Extract to your app directory:
   ```
   C:\Users\[YourUsername]\Desktop\assign\launch-a-quest\llama-cpp-bin\
   ```

4. Verify `llama-cpp-server.exe` exists in that folder

### Step 3: Configure in App Settings

1. Open **Launch a Quest** app
2. Go to **Settings** → **AI Assistant**
3. Fill in the following fields:
   - **LLM Binary Path:** `C:\Users\[YourUsername]\Desktop\assign\launch-a-quest\llama-cpp-bin\llama-cpp-server.exe`
   - **Model Path:** `C:\Users\[YourUsername]\Desktop\assign\launch-a-quest\models\mistral-7b.gguf`
   - **Extra CLI Args:** `-ngl 33 -n 256` (see below for details)
   - **HTTP URL:** Leave blank (we'll use binary spawn)

4. Click **Test Connection** to verify the setup

### Step 4: Optional - Use HTTP Wrapper Instead

If you prefer an HTTP wrapper approach:

1. Install Node.js (if not already installed)
2. In your app directory, run:
   ```powershell
   npm install express body-parser
   ```

3. Start the wrapper:
   ```powershell
   node tools/llm-wrapper/server.js
   ```

4. In Settings, fill:
   - **HTTP URL:** `http://127.0.0.1:8080/generate`
   - Leave binary path blank

---

## Detailed Configuration

### CLI Arguments Explained

**`-ngl 33`** - GPU Layer Offloading
- Offloads 33 layers to GPU (requires CUDA/Metal support)
- Speeds up inference significantly if your GPU supports it
- Remove this flag if you don't have a supported GPU (slower but works)
- For NVIDIA GPUs: Install [CUDA Toolkit 12.0+](https://developer.nvidia.com/cuda-12-0-0-download-archive)
- For AMD GPUs: Requires ROCm support (advanced setup)
- For Intel GPUs: Use `-ngl 33` with Metal on Mac or native on Windows

**`-n 256`** - Max Tokens
- Maximum length of model response (256 tokens ≈ 1000 characters)
- Increase to `-n 512` for longer responses (slower)
- Decrease to `-n 128` for faster, shorter responses

**Other Useful Flags:**
- `-t 4` - Number of threads (default: auto-detect)
- `-m /path/to/model.gguf` - Model path (if not passed as argument)
- `-p "Your prompt here"` - Direct prompt (for testing)
- `-ngl 0` - Disable GPU (CPU-only mode)

### Memory Requirements

**Minimum:**
- RAM: 8 GB
- Q4 model: 4-5 GB
- System overhead: 3-4 GB

**Recommended:**
- RAM: 16 GB
- Allows smooth multitasking while LLM runs

**Q4_K_M Quantization Sizes:**
- Mistral 7B: 4.4 GB
- Llama 2 13B: 7.6 GB

---

## System Compatibility

### Windows
✅ Fully supported  
- Windows 10 or later
- CPU: Intel/AMD with AVX2 support (most modern CPUs)
- GPU: Optional (requires CUDA 12.0+ for NVIDIA)

### macOS
✅ Supported with Metal acceleration  
- macOS 11+
- GPU: Metal (built-in Apple Silicon/Intel support)
- Setup: Similar to Windows, but use Metal flags

### Linux
✅ Supported  
- CPU-only or with CUDA/ROCm
- Setup: Same binary approach

---

## Performance Tuning

### Slow Response Times?

1. **Reduce token limit:**
   ```
   -n 128
   ```

2. **Reduce layer offloading:**
   ```
   -ngl 20  (instead of 33)
   ```

3. **Reduce threads (if system is CPU-bottlenecked):**
   ```
   -t 2
   ```

4. **Use a smaller model:**
   - Try Q3_K or Q2_K quantization (smaller, faster, less accurate)

### Getting Better Answers?

1. **Increase token limit:**
   ```
   -n 512
   ```

2. **Try Mistral 7B Instruct v0.2** (better instruction-following)

3. **Use a larger model:**
   - Llama 2 13B: Better quality, slower
   - Download: [TheBloke/Llama-2-13B-Chat-GGUF](https://huggingface.co/TheBloke/Llama-2-13B-Chat-GGUF)

---

## HTTP Wrapper Server (Alternative Setup)

Create a file `tools/llm-wrapper/server.js`:

```javascript
const express = require('express');
const bodyParser = require('body-parser');
const { spawn } = require('child_process');

const app = express();
app.use(bodyParser.json());

const LLAMA_BIN = 'C:\\path\\to\\llama-cpp-server.exe';
const MODEL = 'C:\\path\\to\\mistral-7b.gguf';

app.post('/generate', async (req, res) => {
  const { prompt, options = {} } = req.body;
  
  return new Promise((resolve) => {
    const child = spawn(LLAMA_BIN, [
      '--model', MODEL,
      '-n', options.tokens || '256',
      '-p', prompt
    ]);

    let output = '';
    child.stdout.on('data', (d) => output += d.toString());
    child.on('close', () => {
      res.json({ text: output });
      resolve();
    });
  });
});

app.listen(8080, () => console.log('LLM HTTP wrapper listening on :8080'));
```

Run with:
```powershell
npm install express body-parser
node tools/llm-wrapper/server.js
```

Then set **HTTP URL** to: `http://127.0.0.1:8080/generate`

---

## Troubleshooting

### "Test Connection Failed"
1. Verify file paths are absolute and correct
2. Check that model file exists and is readable
3. Try with `-t 1` in CLI args
4. Check Windows Defender hasn't blocked the binary

### Model is Very Slow
1. Check if GPU layers are being used (`-ngl 33`)
2. Reduce token count to `-n 128`
3. Close other applications to free RAM
4. Consider using Q3_K quantization (smaller)

### Model gives incoherent responses
1. Use **Mistral 7B Instruct v0.1** (recommended)
2. Increase `-n 512` for longer responses
3. Try the HTTP wrapper instead of binary spawn
4. Check app logs for truncated prompts

### Process is killed unexpectedly
1. Check available RAM (need at least 4 GB free)
2. Reduce layer offloading: `-ngl 20`
3. Reduce threads: `-t 2`
4. Look at Event Viewer for error codes

### App can't find binary/model
1. Double-check absolute paths (no relative paths)
2. Make sure paths don't have special characters
3. Try placing model in app root instead of `models/` subfolder
4. Restart the app after changing settings

---

## Advanced: Build llama.cpp Locally

To compile llama.cpp with latest optimizations:

```bash
# Clone repo
git clone https://github.com/ggerganov/llama.cpp.git
cd llama.cpp

# Windows MSVC build
cmake -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build --config Release

# Binary will be in: build/Release/llama-cpp-server.exe
```

---

## FAQ

**Q: Can I use a different model?**  
A: Yes! Any GGUF quantized model works. Recommended alternatives:
- Llama 2 Chat (13B for better quality)
- Neural Chat (faster, good for brief responses)
- Download from [TheBloke's Hugging Face](https://huggingface.co/TheBloke)

**Q: What happens if I don't have a GPU?**  
A: Model runs on CPU. It will be slower but still functional. Remove `-ngl 33` flag.

**Q: Can I run multiple models?**  
A: Not simultaneously. You can switch models in Settings by changing the Model Path and restarting the app.

**Q: How much internet do I need?**  
A: Only for initial model download. After that, everything runs locally with zero internet usage.

**Q: Is the conversation history saved?**  
A: Yes! Stored in browser localStorage (persists across app restarts). Clears when you click "Clear Conversation" in the AI chat panel.

**Q: Can I use this on a server?**  
A: The Electron app runs on local machines only. For server deployment, see Architecture notes.

---

## Support

For issues:
1. Check app logs: Press `F12` → Console tab
2. Check Windows Event Viewer for crash reports
3. Verify file paths are correctly formatted
4. Try the HTTP wrapper approach as an alternative to binary spawn

For llama.cpp specific help:
- [llama.cpp GitHub Issues](https://github.com/ggerganov/llama.cpp/issues)
- [TheBloke Hugging Face](https://huggingface.co/TheBloke) (model quality)

---

## Next Steps

1. ✅ Model and llama.cpp binary downloaded
2. ✅ Paths configured in Settings
3. ✅ Test Connection passed
4. Start chatting with your local AI!

**Note:** First response may take 10-30 seconds as the model loads into memory. Subsequent responses are faster.
