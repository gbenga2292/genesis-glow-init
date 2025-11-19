import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import * as db from './database.js';
import { RetryManager } from './retryManager.js';

// Remote-only LLM manager: accepts remote config and proxies generate/status calls to remote provider.
class LLMManager {
  constructor() {
    this.remoteConfig = null; // { enabled, provider, endpoint, apiKey, model }
    this.userDataPath = app.getPath('userData');
    this.retryManager = new RetryManager();
    this.configPath = path.join(this.userDataPath, 'llm-config.json');

    // Load existing config if present
    try {
      if (fs.existsSync(this.configPath)) {
        const raw = fs.readFileSync(this.configPath, 'utf-8');
        const cfg = JSON.parse(raw);
        this.remoteConfig = cfg.remote || null;
      }
    } catch (err) {
      console.warn('Failed to load llm-config.json', err);
      this.remoteConfig = null;
    }
  }

  // Configure remote settings (persisted)
  async updateModelPath(newCfg) {
    // Accept object with remote
    let cfg = {};
    if (fs.existsSync(this.configPath)) {
      try { cfg = JSON.parse(fs.readFileSync(this.configPath, 'utf-8')); } catch {}
    }

    if (newCfg && typeof newCfg === 'object') {
      if (newCfg.remote) {
        // If an API key was provided, try to store it securely via keytar
        const remoteCopy = { ...newCfg.remote };
        if (remoteCopy.apiKey) {
          try {
            const keytarModule = await import('keytar');
            const keytar = keytarModule.default || keytarModule;
            const SERVICE = 'hi-there-project-09-ai';
            const ACCOUNT = 'default';
            await keytar.setPassword(SERVICE, ACCOUNT, remoteCopy.apiKey);
            // remove plaintext key before persisting
            delete remoteCopy.apiKey;
            console.log('LLM: Stored API key securely in OS credential store');
          } catch (err) {
            console.warn('LLM: Failed to store API key in secure store, falling back to config file', err);
          }
        }

        cfg.remote = remoteCopy;
        this.remoteConfig = remoteCopy;
      }
      if (newCfg.modelPath) {
        cfg.modelPath = newCfg.modelPath;
      }
    }

    try {
      fs.writeFileSync(this.configPath, JSON.stringify(cfg, null, 2));
      return { success: true, message: 'Remote AI configuration updated.' };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  }

  // No-op start: for remote mode just validate connectivity if enabled
  async start() {
    if (this.remoteConfig && this.remoteConfig.enabled) {
      const res = await this._testRemote();
      if (res && res.success) return { success: true, message: 'Remote LLM configured' };
      return { success: false, error: res && res.message ? res.message : 'Remote LLM not reachable' };
    }
    return { success: true, message: 'No local LLM configured (remote disabled).' };
  }

  stop() {
    return { success: true, message: 'No local LLM to stop.' };
  }

  async restart() {
    return await this.start();
  }

  async getStatus() {
    const available = !!(this.remoteConfig && this.remoteConfig.enabled);
    let remoteConfigured = false;
    let keyLocation = null;

    try {
      // If API key is present in config, consider configured
      if (this.remoteConfig && this.remoteConfig.apiKey) {
        remoteConfigured = true;
        keyLocation = 'config';
      } else {
        // Try secure store
        const resolved = await this._resolveApiKey(this.remoteConfig);
        if (resolved) {
          remoteConfigured = true;
          keyLocation = 'secure-store';
        }
      }
    } catch (err) {
      // ignore resolution errors
    }

    return {
      available,
      remoteConfigured,
      keyLocation,
      remote: this.remoteConfig || null
    };
  }

  // resolve API key from secure store (keytar) or fallback to DB company settings
  async _resolveApiKey(cfg) {
    // Prefer keytar
    try {
      const keytarModule = await import('keytar');
      const keytar = keytarModule.default || keytarModule;
      const SERVICE = 'hi-there-project-09-ai';
      const ACCOUNT = (cfg && cfg.account) ? String(cfg.account) : 'default';
      const stored = await keytar.getPassword(SERVICE, ACCOUNT);
      if (stored) return stored;
    } catch (err) {
      // keytar unavailable or failed
    }

    // Fallback to company settings in DB
    try {
      if (db && typeof db.getCompanySettings === 'function') {
        const cs = await db.getCompanySettings();
        if (cs && cs.ai && cs.ai.remote && cs.ai.remote.apiKey) return cs.ai.remote.apiKey;
      }
    } catch (err) {
      // ignore
    }
    return null;
  }

  // Returns { success: boolean, status?: number, message?: string }
  async _testRemote() {
    if (!this.remoteConfig) return { success: false, message: 'Remote configuration missing' };
    const cfg = { ...this.remoteConfig };
    // Resolve API key: prefer secure store, then DB company settings
    if (!cfg.apiKey) {
      try {
        const stored = await this._resolveApiKey(cfg);
        if (stored) cfg.apiKey = stored;
      } catch (err) {
        // ignore
      }
    }

    if (!cfg.apiKey) {
      return { success: false, message: 'No API key provided. Please configure an API key in Settings.' };
    }

    try {
      // OpenAI check
      if ((cfg.provider === 'openai') || (cfg.endpoint && cfg.endpoint.includes('openai.com'))) {
        const url = cfg.endpoint || 'https://api.openai.com/v1/models';
        const res = await fetch(url, { method: 'GET', headers: { Authorization: `Bearer ${cfg.apiKey}` }, signal: AbortSignal.timeout(7000) });
        if (res.ok) return { success: true, status: res.status, message: 'OK' };
        const body = await res.text().catch(() => '');
        return { success: false, status: res.status, message: `Remote API returned ${res.status}: ${body}` };
      }

      // Google AI Studio (Gemini) check
      else if (cfg.provider === 'google') {
        const model = cfg.model || 'gemini-1.5-flash';
        const url = `https://generativelanguage.googleapis.com/v1/models/${model}?key=${cfg.apiKey}`;
        const res = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(7000) });
        if (res.ok) return { success: true, status: res.status, message: 'OK' };
        const body = await res.text().catch(() => '');
        return { success: false, status: res.status, message: `Remote API returned ${res.status}: ${body}` };
      }

      // Generic endpoint ping
      if (cfg.endpoint) {
        const res = await fetch(cfg.endpoint, { method: 'GET', headers: cfg.apiKey ? { Authorization: `Bearer ${cfg.apiKey}` } : {}, signal: AbortSignal.timeout(7000) });
        if (res.ok || res.status === 503) return { success: true, status: res.status, message: 'OK' };
        const body = await res.text().catch(() => '');
        return { success: false, status: res.status, message: `Remote endpoint returned ${res.status}: ${body}` };
      }

      return { success: false, message: 'No remote endpoint configured' };
    } catch (err) {
      return { success: false, message: `Network error: ${String(err)}` };
    }
  }

  // Generate using remote provider
  async generate(prompt, options = {}) {
    if (!this.remoteConfig || !this.remoteConfig.enabled) {
      return { success: false, error: 'Remote AI not configured' };
    }

    const cfgBase = { ...this.remoteConfig };
    const cfg = { ...cfgBase };
    // Resolve API key from secure store or DB if missing
    if (!cfg.apiKey) {
      try {
        const stored = await this._resolveApiKey(cfg);
        if (stored) cfg.apiKey = stored;
      } catch (err) {
        // ignore
      }
    }
    try {
      // OpenAI-compatible
      if (cfg.provider === 'openai' || (cfg.endpoint && cfg.endpoint.includes('openai.com'))) {
        const url = cfg.endpoint || 'https://api.openai.com/v1/chat/completions';
        const body = {
          model: options.model || cfg.model || 'gpt-4',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: options.maxTokens || 256,
          temperature: options.temperature || 0.7
        };
        
        // Use retry manager for resilience against rate limiting
        const res = await this.retryManager.fetchWithRetry(
          url,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${cfg.apiKey}`
            },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(60000)
          },
          {
            maxRetries: 2,
            initialDelay: 1000,
            maxDelay: 10000
          }
        );
        
        if (!res.ok) {
          const errText = await res.text();
          let errorMessage = `HTTP ${res.status}`;
          
          // Try to parse JSON error response
          try {
            const errJson = JSON.parse(errText);
            if (errJson.error) {
              if (typeof errJson.error === 'string') {
                errorMessage += `: ${errJson.error}`;
              } else if (errJson.error.message) {
                errorMessage += `: ${errJson.error.message}`;
              }
            }
          } catch {
            // If not JSON, just use the raw text (first 100 chars)
            if (errText.length > 0) {
              errorMessage += `: ${errText.substring(0, 100)}`;
            }
          }
          
          return { success: false, error: `Remote API error: ${res.status} - ${errorMessage}` };
        }
        const j = await res.json();
        const text = (j.choices && j.choices[0] && (j.choices[0].message?.content || j.choices[0].text)) || j.output?.text || '';
        return { success: true, text: (text || '').trim(), raw: j };
      }

      // Google AI Platform (Gemini)
      else if (cfg.provider === 'google') {
        const model = cfg.model || 'gemini-1.5-flash'; // Fallback to a known model
        const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${cfg.apiKey}`;
        const body = {
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            temperature: options.temperature || 0.7,
            maxOutputTokens: options.maxTokens || 256
          }
        };

        const res = await this.retryManager.fetchWithRetry(
          url,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(60000)
          },
          { maxRetries: 2, initialDelay: 1000, maxDelay: 10000 }
        );

        if (!res.ok) {
          const errText = await res.text();
          let errorMessage = `HTTP ${res.status}`;
          try {
            const errJson = JSON.parse(errText);
            if (errJson.error && errJson.error.message) {
              errorMessage += `: ${errJson.error.message}`;
            }
          } catch {
            if (errText.length > 0) {
              errorMessage += `: ${errText.substring(0, 100)}`;
            }
          }
          return { success: false, error: `Remote API error: ${errorMessage}` };
        }

        const j = await res.json();
        const text = j.candidates?.[0]?.content?.parts?.[0]?.text || '';
        return { success: true, text: text.trim(), raw: j };
      }

      // Generic endpoint
      if (cfg.endpoint) {
        const res = await this.retryManager.fetchWithRetry(
          cfg.endpoint,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(cfg.apiKey ? { Authorization: `Bearer ${cfg.apiKey}` } : {})
            },
            body: JSON.stringify({ prompt, options }),
            signal: AbortSignal.timeout(60000)
          },
          {
            maxRetries: 2,
            initialDelay: 1000,
            maxDelay: 10000
          }
        );
        
        if (!res.ok) {
          const e = await res.text();
          return { success: false, error: `Remote API error: ${res.status} - ${e.substring(0, 100)}` };
        }
        const j = await res.json();
        return { success: true, text: j.text || j.output || JSON.stringify(j), raw: j };
      }

      return { success: false, error: 'No remote endpoint configured' };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  }
}

export { LLMManager };
