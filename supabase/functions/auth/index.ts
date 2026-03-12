import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Safe columns - never return password_hash, mfa_secret, pin_hash
const SAFE_USER_COLUMNS = 'id, username, role, name, email, bio, phone, avatar, avatar_color, status, last_active, created_at, updated_at, preferences, mfa_enabled, signature_path, signature_uploaded_at';

function getSupabaseAdmin() {
  const url = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  return createClient(url, serviceKey);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, ...params } = await req.json();
    const supabase = getSupabaseAdmin();

    switch (action) {
      case 'login': {
        const { username, password } = params;
        if (!username || !password) {
          return jsonResponse({ success: false, message: 'Username and password required' }, 400);
        }

        // Try username first, then email
        let { data, error } = await supabase
          .from('users')
          .select(`${SAFE_USER_COLUMNS}, password_hash, mfa_enabled, mfa_secret`)
          .ilike('username', username)
          .maybeSingle();

        if (!data) {
          const emailResult = await supabase
            .from('users')
            .select(`${SAFE_USER_COLUMNS}, password_hash, mfa_enabled, mfa_secret`)
            .ilike('email', username)
            .maybeSingle();
          data = emailResult.data;
          error = emailResult.error;
        }

        if (error || !data) {
          return jsonResponse({ success: false, message: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, data.password_hash || '');
        if (!isMatch) {
          return jsonResponse({ success: false, message: 'Invalid credentials' });
        }

        if (data.status === 'inactive') {
          return jsonResponse({ success: false, message: 'Access blocked' });
        }

        if (data.mfa_enabled) {
          return jsonResponse({ success: false, mfaRequired: true, userId: data.id.toString() });
        }

        // Record login & update last active
        await supabase.from('login_history').insert({
          user_id: data.id,
          login_type: 'password',
          status: 'success',
        });
        await supabase.from('users').update({ last_active: new Date().toISOString() }).eq('id', data.id);

        // Strip sensitive fields before returning
        const { password_hash, mfa_secret, ...safeUser } = data;
        return jsonResponse({ success: true, user: formatUser(safeUser) });
      }

      case 'verify-mfa': {
        const { userId, code } = params;
        if (!userId || !code) {
          return jsonResponse({ success: false, message: 'User ID and code required' }, 400);
        }

        const { data, error } = await supabase
          .from('users')
          .select(`${SAFE_USER_COLUMNS}, mfa_secret`)
          .eq('id', userId)
          .single();

        if (error || !data) {
          return jsonResponse({ success: false, message: 'User not found' });
        }

        if (!data.mfa_secret) {
          return jsonResponse({ success: false, message: 'MFA not set up for this user' });
        }

        // TOTP verification using HMAC-based algorithm
        const isValid = verifyTOTP(code, data.mfa_secret);
        if (!isValid) {
          return jsonResponse({ success: false, message: 'Invalid authentication code' });
        }

        await supabase.from('login_history').insert({
          user_id: parseInt(userId),
          login_type: 'mfa',
          status: 'success',
        });
        await supabase.from('users').update({ last_active: new Date().toISOString() }).eq('id', userId);

        const { mfa_secret, ...safeUser } = data;
        return jsonResponse({ success: true, user: formatUser(safeUser) });
      }

      case 'verify-pin': {
        const { userId, pin } = params;
        if (!userId || !pin) {
          return jsonResponse({ success: false, message: 'User ID and PIN required' }, 400);
        }

        const { data, error } = await supabase
          .from('users')
          .select('pin_hash')
          .eq('id', userId)
          .single();

        if (error || !data) {
          return jsonResponse({ success: false, message: 'User not found' });
        }

        if (!data.pin_hash) {
          // No PIN set - allow unlock
          return jsonResponse({ success: true, noPinSet: true });
        }

        const isMatch = await bcrypt.compare(pin, data.pin_hash);
        return jsonResponse({ success: isMatch, message: isMatch ? undefined : 'Incorrect PIN' });
      }

      case 'hash-password': {
        const { password } = params;
        if (!password) {
          return jsonResponse({ success: false, message: 'Password required' }, 400);
        }
        const hash = await bcrypt.hash(password);
        return jsonResponse({ success: true, hash });
      }

      case 'set-pin': {
        const { userId, pin } = params;
        if (!userId || !pin) {
          return jsonResponse({ success: false, message: 'User ID and PIN required' }, 400);
        }
        if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
          return jsonResponse({ success: false, message: 'PIN must be exactly 4 digits' }, 400);
        }
        const pinHash = await bcrypt.hash(pin);
        const { error } = await supabase.from('users').update({ pin_hash: pinHash }).eq('id', userId);
        if (error) return jsonResponse({ success: false, message: error.message });
        return jsonResponse({ success: true });
      }

      case 'remove-pin': {
        const { userId } = params;
        if (!userId) {
          return jsonResponse({ success: false, message: 'User ID required' }, 400);
        }
        const { error } = await supabase.from('users').update({ pin_hash: null }).eq('id', userId);
        if (error) return jsonResponse({ success: false, message: error.message });
        return jsonResponse({ success: true });
      }

      case 'check-pin-status': {
        const { userId } = params;
        if (!userId) {
          return jsonResponse({ success: false, message: 'User ID required' }, 400);
        }
        const { data, error } = await supabase
          .from('users')
          .select('pin_hash')
          .eq('id', userId)
          .single();
        if (error) return jsonResponse({ success: false, message: error.message });
        return jsonResponse({ success: true, hasPinSet: !!data?.pin_hash });
      }

      default:
        return jsonResponse({ success: false, message: 'Unknown action' }, 400);
    }
  } catch (error) {
    console.error('Auth function error:', error);
    return jsonResponse({ success: false, message: 'Internal server error' }, 500);
  }
});

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function formatUser(data: any) {
  return {
    id: data.id?.toString(),
    username: data.username,
    role: data.role,
    name: data.name,
    email: data.email || undefined,
    bio: data.bio || undefined,
    phone: data.phone || undefined,
    avatar: data.avatar || undefined,
    avatarColor: data.avatar_color || undefined,
    status: data.status,
    lastActive: data.last_active || undefined,
    signatureUrl: data.signature_path || undefined,
    created_at: data.created_at,
    updated_at: data.updated_at,
    preferences: data.preferences || undefined,
    mfa_enabled: data.mfa_enabled || false,
  };
}

// Simple TOTP verification (RFC 6238)
function verifyTOTP(token: string, secret: string): boolean {
  try {
    const time = Math.floor(Date.now() / 1000 / 30);
    // Check current and adjacent windows for clock drift
    for (let i = -1; i <= 1; i++) {
      const generated = generateTOTP(secret, time + i);
      if (generated === token) return true;
    }
    return false;
  } catch {
    return false;
  }
}

function generateTOTP(secret: string, counter: number): string {
  // Base32 decode
  const base32chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (const c of secret.toUpperCase().replace(/=+$/, '')) {
    const val = base32chars.indexOf(c);
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, '0');
  }
  const keyBytes = new Uint8Array(Math.floor(bits.length / 8));
  for (let i = 0; i < keyBytes.length; i++) {
    keyBytes[i] = parseInt(bits.substr(i * 8, 8), 2);
  }

  // Counter to 8-byte buffer
  const counterBytes = new Uint8Array(8);
  let tmp = counter;
  for (let i = 7; i >= 0; i--) {
    counterBytes[i] = tmp & 0xff;
    tmp = Math.floor(tmp / 256);
  }

  // HMAC-SHA1 (using Web Crypto would be async; use simple implementation for edge)
  // For production, this should use crypto.subtle - but keeping sync for simplicity
  // This is a simplified version; the actual TOTP lib handles this
  const hmac = hmacSha1(keyBytes, counterBytes);
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code = ((hmac[offset] & 0x7f) << 24 |
    (hmac[offset + 1] & 0xff) << 16 |
    (hmac[offset + 2] & 0xff) << 8 |
    (hmac[offset + 3] & 0xff)) % 1000000;
  return code.toString().padStart(6, '0');
}

// Minimal HMAC-SHA1 for TOTP (synchronous)
function hmacSha1(key: Uint8Array, message: Uint8Array): Uint8Array {
  const blockSize = 64;
  let k = key;
  if (k.length > blockSize) {
    k = sha1(k);
  }
  const ipad = new Uint8Array(blockSize);
  const opad = new Uint8Array(blockSize);
  for (let i = 0; i < blockSize; i++) {
    ipad[i] = (k[i] || 0) ^ 0x36;
    opad[i] = (k[i] || 0) ^ 0x5c;
  }
  const inner = new Uint8Array(blockSize + message.length);
  inner.set(ipad);
  inner.set(message, blockSize);
  const innerHash = sha1(inner);
  const outer = new Uint8Array(blockSize + 20);
  outer.set(opad);
  outer.set(innerHash, blockSize);
  return sha1(outer);
}

function sha1(data: Uint8Array): Uint8Array {
  let h0 = 0x67452301;
  let h1 = 0xEFCDAB89;
  let h2 = 0x98BADCFE;
  let h3 = 0x10325476;
  let h4 = 0xC3D2E1F0;

  const ml = data.length * 8;
  const padded = new Uint8Array(Math.ceil((data.length + 9) / 64) * 64);
  padded.set(data);
  padded[data.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 4, ml, false);

  for (let offset = 0; offset < padded.length; offset += 64) {
    const w = new Uint32Array(80);
    for (let i = 0; i < 16; i++) {
      w[i] = view.getUint32(offset + i * 4, false);
    }
    for (let i = 16; i < 80; i++) {
      w[i] = rotl(w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16], 1);
    }
    let a = h0, b = h1, c = h2, d = h3, e = h4;
    for (let i = 0; i < 80; i++) {
      let f: number, k: number;
      if (i < 20) { f = (b & c) | (~b & d); k = 0x5A827999; }
      else if (i < 40) { f = b ^ c ^ d; k = 0x6ED9EBA1; }
      else if (i < 60) { f = (b & c) | (b & d) | (c & d); k = 0x8F1BBCDC; }
      else { f = b ^ c ^ d; k = 0xCA62C1D6; }
      const temp = (rotl(a, 5) + f + e + k + w[i]) >>> 0;
      e = d; d = c; c = rotl(b, 30); b = a; a = temp;
    }
    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
  }

  const result = new Uint8Array(20);
  const rv = new DataView(result.buffer);
  rv.setUint32(0, h0, false);
  rv.setUint32(4, h1, false);
  rv.setUint32(8, h2, false);
  rv.setUint32(12, h3, false);
  rv.setUint32(16, h4, false);
  return result;
}

function rotl(n: number, s: number): number {
  return ((n << s) | (n >>> (32 - s))) >>> 0;
}
