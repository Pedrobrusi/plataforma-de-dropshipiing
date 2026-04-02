import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-32-char-key-for-dev-only!';

export function encrypt(text: string): string {
  return CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString();
}

export function decrypt(ciphertext: string): string {
  const bytes = CryptoJS.AES.decrypt(ciphertext, ENCRYPTION_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
}

export function hashToken(token: string): string {
  return CryptoJS.SHA256(token).toString();
}

export function generateApiKey(prefix = 'ak'): string {
  const random = CryptoJS.lib.WordArray.random(32).toString();
  return `${prefix}_${random}`;
}
