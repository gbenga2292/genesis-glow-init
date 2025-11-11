#!/usr/bin/env node
// Simple example HTTP wrapper for a local LLM binary (e.g., llama.cpp)
// This is a minimal example for development only. Adjust args and CLI flags for your binary.

const express = require('express');
const bodyParser = require('body-parser');
const { spawn } = require('child_process');
const app = express();
app.use(bodyParser.json());

const PORT = process.env.PORT || 8080;
const LLM_BINARY = process.env.LLAMA_BINARY || 'llama.cpp'; // replace with your wrapper binary path
const MODEL_PATH = process.env.LLAMA_MODEL || process.env.MODEL_PATH || '';

app.post('/generate', async (req, res) => {
  const { prompt, options } = req.body || {};
  if (!prompt) return res.status(400).json({ error: 'Missing prompt' });

  const args = [];
  if (MODEL_PATH) {
    args.push('--model', MODEL_PATH);
  }
  // append any options as flags
  if (options && options.maxTokens) {
    args.push('--max_tokens', String(options.maxTokens));
  }

  try {
    const child = spawn(LLM_BINARY, args, { stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (c) => stdout += c.toString());
    child.stderr.on('data', (c) => stderr += c.toString());

    child.on('error', (err) => {
      console.error('LLM spawn error', err);
      res.status(500).json({ error: err.message });
    });

    child.on('close', (code) => {
      if (code === 0 || stdout.length > 0) {
        res.json({ text: stdout.trim(), raw: stdout, stderr });
      } else {
        res.status(500).json({ error: `Process exited with ${code}`, stderr });
      }
    });

    // write prompt to stdin
    child.stdin.write(prompt);
    child.stdin.end();
  } catch (err) {
    console.error('Error running LLM', err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`LLM wrapper listening on http://127.0.0.1:${PORT}`);
});
