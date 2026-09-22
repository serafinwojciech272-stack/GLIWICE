import crypto from 'node:crypto';

const API_BASE = process.env.ALLEGRO_ENVIRONMENT === 'production' ? 'https://api.allegro.pl' : 'https://api.allegro.pl.allegrosandbox.pl';

function openSession(cookie) {
  const secret = process.env.ALLEGRO_SESSION_SECRET;
  if (!secret || !cookie) return null;
  try {
    const [iv64, tag64, data64] = cookie.split('.');
    const key = crypto.createHash('sha256').update(secret).digest();
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv64, 'base64url'));
    decipher.setAuthTag(Buffer.from(tag64, 'base64url'));
    return JSON.parse(Buffer.concat([decipher.update(Buffer.from(data64, 'base64url')), decipher.final()]).toString('utf8'));
  } catch { return null; }
}
function cookies(header = '') {
  return Object.fromEntries(header.split(';').map(x=>x.trim().split('=' )).filter(x=>x.length===2).map(([k,v])=>[k,decodeURIComponent(v)]));
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });
  const session = openSession(cookies(req.headers.cookie).allegro_session);
  if (!session?.accessToken) return res.status(401).json({ error: 'allegro_not_connected' });
  if (session.expiresAt && Date.now() >= session.expiresAt) return res.status(401).json({ error: 'allegro_session_expired' });

  const phrase = String(req.query?.phrase ?? '').trim();
  if (!phrase) return res.status(400).json({ error: 'phrase_required' });
  const url = new URL(API_BASE + '/offers/listing');
  url.searchParams.set('phrase', phrase);
  url.searchParams.set('limit', String(Math.min(100, Math.max(1, Number(req.query?.limit ?? 20)))));
  const response = await fetch(url, { headers: { Authorization: 'Bearer ' + session.accessToken, Accept: 'application/vnd.allegro.public.v1+json', 'Accept-Language': 'pl-PL' } });
  const body = await response.text();
  res.status(response.status).setHeader('Content-Type','application/json').send(body);
}
