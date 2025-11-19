# AI Assistant Configuration Guide

The AI Assistant is now powered by remote API providers (online). This guide explains how to set up and use it.

## Overview

The AI Assistant connects to a remote AI provider (e.g., OpenAI) using an API key. All requests are sent to the provider's endpoint — no local LLM runtime is required.

**Features:**
- Remote-only operation (no offline/bundled LLM)
- Support for OpenAI and custom endpoints
- API key stored securely (OS credential store + database backup)
- Cross-machine configuration sync via database

---

## Quick Start (Windows)

### Step 1: Get an API Key

1. Visit your AI provider's website (e.g., [OpenAI](https://platform.openai.com/))
2. Sign up or log in
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key (you'll need it shortly)

### Step 2: Configure in the App

1. Open the app
2. Go to **Settings** → **AI Assistant**
3. Toggle **Enable AI Assistant** to ON
4. Select a provider:
   - **OpenAI** (default) — uses https://api.openai.com/v1/chat/completions
   - **Custom** — provide your own endpoint URL
5. Paste your API key into the **API Key** field
6. (Optional) Enter a custom endpoint or model name
7. Click **Test Connection** to verify
8. Click **Save AI Settings**

### Step 3: Use the AI Assistant

Once configured, you can use the AI Assistant from the app:
- Chat with the assistant to ask questions or get help
- Use AI-powered actions (e.g., generate reports, analyze data)
- The assistant will send requests to your configured provider

---

## API Key Storage

Your API key is stored in **two places** for safety and convenience:

### 1. OS Credential Store (Secure)
- Stored securely using the OS credential manager (Windows Credential Manager, macOS Keychain, etc.)
- **Pros:** Encrypted, isolated per machine, cannot be accessed by other apps
- **Cons:** Not synced across machines

### 2. Database (Backup)
- Also stored in the company settings database record
- **Pros:** Synced across machines when you switch PCs; provides a fallback
- **Cons:** Less secure than OS credential store (depends on DB encryption)

**How it works:**
- When you save the API key in Settings, it's automatically stored in the OS credential store (if available)
- A backup copy is also saved to the database
- When the app starts, it attempts to load the key from the OS credential store first
- If the credential store is empty (e.g., on a new machine), it falls back to the database copy

### Migrate Keys

If you have an old plaintext API key in the database, you can migrate it to the secure OS store:

1. Go to **Settings** → **AI Assistant**
2. Click **Migrate Key to Secure Store**
3. The app will move the key from the database into the OS credential store

### Clear Keys

To clear your API key:

1. Go to **Settings** → **AI Assistant**
2. Click **Clear Secure Key** to remove only the OS credential store copy
3. (Optional) To also clear the database copy, use the app's **Clear API key** action (if available in future updates)

---

## Supported Providers

### OpenAI
- **Default endpoint:** `https://api.openai.com/v1/chat/completions`
- **Models:** `gpt-3.5-turbo`, `gpt-4`, etc.
- **Setup:** Create an account at [OpenAI Platform](https://platform.openai.com/), then grab an API key

### Custom Providers
- **Endpoint:** Any OpenAI-compatible or custom HTTP endpoint
- **API Key:** Format depends on your provider (usually `Bearer <token>` or custom header)
- **Examples:**
  - Self-hosted LLM server (e.g., vLLM, Text Generation WebUI)
  - Other AI APIs (Anthropic Claude, Hugging Face, etc.)

To use a custom provider:
1. Select **Custom** as the provider
2. Enter your endpoint URL
3. Provide your API key
4. (Optional) Enter the model name

---

## Troubleshooting

### "Test Connection Failed"
- ✓ Verify your API key is correct
- ✓ Check your internet connection
- ✓ Ensure the endpoint URL is reachable
- ✓ Check provider status (API may be down or your account may be rate-limited)

### "AI Assistant Not Available"
- ✓ Make sure the toggle is ON in Settings
- ✓ Re-enter your API key and click **Test Connection**
- ✓ Check that your provider account has remaining API credits/limits

### API Key Not Persisting Across Machines
- ✓ First time on a new machine? The app will load your key from the database
- ✓ If using a custom provider, verify the endpoint is the same on both machines
- ✓ You can manually migrate the key to the OS store on the new machine via **Migrate Key to Secure Store**

### "Endpoint Not Found" or Similar Errors
- ✓ Verify the endpoint URL is correct and includes the full path (e.g., `/v1/chat/completions` for OpenAI)
- ✓ If using a custom endpoint, ensure it's running and accessible from your machine
- ✓ Check firewall/network settings if using a local server

---

## Security Notes

- **API Key Safety:** Treat your API key like a password. Never share it or commit it to version control.
- **Database Encryption:** The database copy of your API key is not encrypted by default. For production use, consider enabling database encryption or using the secure OS store exclusively.
- **Credential Rotation:** If you suspect your API key has been compromised, rotate it immediately in your provider's settings and update it in the app.

---

## Advanced Setup

### Using Environment Variables (Optional)

For automation or secure CI/CD scenarios, you can pre-populate the API key via environment variables:
(This feature is not yet implemented; contact support if needed.)

### Self-Hosted LLM Server

To use a self-hosted LLM server (e.g., vLLM, Ollama):

1. Ensure your LLM server is running and exposes an HTTP endpoint
2. In the app, select **Custom** provider
3. Enter your server's endpoint (e.g., `http://localhost:8000/v1/chat/completions`)
4. Leave the API key blank if your server doesn't require authentication, or enter a dummy key
5. Click **Test Connection**

---

## Support

For issues or questions:
- Check the troubleshooting section above
- Contact your AI provider's support team if the issue is provider-specific
- Report app bugs to the development team

