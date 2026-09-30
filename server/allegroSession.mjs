import crypto from 'node:crypto';

/**
 * Single Allegro session implementation.
 *
 * Shared by the Vercel serverless OAuth endpoints (api/allegro/*) and the gateway
 * Allegro adapter. The session is an opaque AES-256-GCM sealed cookie; the access
 * token never leaves the server. There is no separate token store.
 */

export function sessionSecret() {
  return process.env.ALLEGRO_SESSION_SECRET || '';
}

export function sealSession(value, secret = sessionSecret()) {
  const key = crypto.createHash('sha256').update(secret).digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map(x => x.toString('base64url')).join('.');
}

export function openSession(cookie, secret = sessionSecret()) {
  if (!secret || !cookie) return null;
  try {
    const [iv64, tag64, data64] = String(cookie).split('.');
    const key = crypto.createHash('sha256').update(secret).digest();
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv64, 'base64url'));
    decipher.setAuthTag(Buffer.from(tag64, 'base64url'));
    return JSON.parse(Buffer.concat([decipher.update(Buffer.from(data64, 'base64url')), decipher.final()]).toString('utf8'));
  } catch {
    return null;
  }
}

export function parseCookies(header = '') {
  return Object.fromEntries(
    String(header)
      .split(';')
      .map(x => x.trim().split('='))
      .filter(x => x.length === 2)
      .map(([k, v]) => [k, decodeURIComponent(v)]),
  );
}
