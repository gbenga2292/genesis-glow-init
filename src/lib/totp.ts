
// Basic TOTP implementation using Web Crypto API
// Conforms to RFC 6238 (TOTP) and RFC 4226 (HOTP)

export const generateSecret = (length: number = 20): string => {
    const randomValues = new Uint8Array(length);
    window.crypto.getRandomValues(randomValues);
    return encodeBase32(randomValues);
};

export const generateToken = async (secret: string, window = 0): Promise<string> => {
    const counter = Math.floor(Date.now() / 30000);
    return generateHOTP(secret, counter + window);
};

export const verifyToken = async (token: string, secret: string, window = 1): Promise<boolean> => {
    for (let i = -window; i <= window; i++) {
        const generated = await generateToken(secret, i);
        if (generated === token) {
            return true;
        }
    }
    return false;
};

// Helpers

const generateHOTP = async (secret: string, counter: number): Promise<string> => {
    const decodedSecret = decodeBase32(secret);
    const buffer = new ArrayBuffer(8);
    const view = new DataView(buffer);
    view.setBigUint64(0, BigInt(counter), false);

    const key = await window.crypto.subtle.importKey(
        'raw',
        decodedSecret as BufferSource,
        { name: 'HMAC', hash: 'SHA-1' },
        false,
        ['sign']
    );

    const signature = await window.crypto.subtle.sign('HMAC', key, buffer);
    const signatureArray = new Uint8Array(signature);

    const offset = signatureArray[signatureArray.length - 1] & 0xf;
    const binary =
        ((signatureArray[offset] & 0x7f) << 24) |
        ((signatureArray[offset + 1] & 0xff) << 16) |
        ((signatureArray[offset + 2] & 0xff) << 8) |
        (signatureArray[offset + 3] & 0xff);

    const otp = binary % 1000000;
    return otp.toString().padStart(6, '0');
};

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

const encodeBase32 = (buffer: Uint8Array): string => {
    let bits = 0;
    let value = 0;
    let output = '';

    for (let i = 0; i < buffer.length; i++) {
        value = (value << 8) | buffer[i];
        bits += 8;

        while (bits >= 5) {
            output += alphabet[(value >>> (bits - 5)) & 31];
            bits -= 5;
        }
    }

    if (bits > 0) {
        output += alphabet[(value << (5 - bits)) & 31];
    }

    return output;
};

const decodeBase32 = (base32: string): Uint8Array => {
    let bits = 0;
    let value = 0;
    let index = 0;
    const buffer = new Uint8Array((base32.length * 5) / 8);

    for (let i = 0; i < base32.length; i++) {
        const char = base32[i].toUpperCase();
        const val = alphabet.indexOf(char);
        if (val === -1) continue;

        value = (value << 5) | val;
        bits += 5;

        if (bits >= 8) {
            buffer[index++] = (value >>> (bits - 8)) & 255;
            bits -= 8;
        }
    }

    return buffer;
};

// Generates a Google Authenticator compatible URL
export const generateOtpAuthUrl = (secret: string, label: string, issuer: string): string => {
    return `otpauth://totp/${encodeURIComponent(label)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}`;
};
