const enc = new TextEncoder();
const dec = new TextDecoder();
export const b64 = (b: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(b)));
export const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');

export const randomSalt = () => b64(crypto.getRandomValues(new Uint8Array(16)));
export const sha256 = async (t: string) => hex(await crypto.subtle.digest('SHA-256', enc.encode(t)));

/** PBKDF2 (100,000 iterations) -> AES-256-GCM key */
export async function deriveKey(secret: string, saltB64: string) {
  const base = await crypto.subtle.importKey('raw', enc.encode(secret), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: unb64(saltB64), iterations: 100_000, hash: 'SHA-256' },
    base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'],
  );
}
export async function encryptJson(key: CryptoKey, obj: unknown) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(obj)));
  return { iv: b64(iv), data: b64(ct) };
}
export async function decryptJson<T>(key: CryptoKey, iv: string, data: string): Promise<T> {
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(iv) }, key, unb64(data));
  return JSON.parse(dec.decode(pt)) as T;
}
export async function hmacSha256(secret: string, text: string) {
  const k = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', k, enc.encode(text)));
}
