import crypto from 'node:crypto';

const AUTH_BASE = process.env.ALLEGRO_ENVIRONMENT === 'production' ? 'https://allegro.pl/auth/oauth' : 'https://allegro.pl.allegrosandbox.pl/auth/oauth';
const secret = () => process.env.ALLEGRO_SESSION_SECRET || '';

function seal(value) {
  const key = crypto.createHash('sha256').update(secret()).digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map(x => x.toString('base64url')).join('.');
}

function parseCookies(header = '') {
  return Object.fromEntries(header.split(';').map(x => x.trim().split('=' )).filter(x => x.length === 2).map(([k,v]) => [k, decodeURIComponent(v)]));
}

export default async function handler(req, res) {
  const clientId = process.env.ALLEGRO_CLIENT_ID;
  const clientSecret = process.env.ALLEGRO_CLIENT_SECRET;
  const redirectUri = process.env.ALLEGRO_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri || !secret()) return res.status(503).json({ error: 'allegro_oauth_not_configured' });

  const action = String(req.query?.action ?? 'authorize');

  if (action === 'authorize') {
    const state = crypto.randomBytes(24).toString('base64url');
    const url = new URL(AUTH_BASE + '/authorize');
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('state', state);
    url.searchParams.set('scope', 'allegro_api');
    res.setHeader('Set-Cookie', `allegro_oauth_state=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`);
    return res.redirect(302, url.toString());
  }

  if (action !== 'callback') return res.status(400).json({ error: 'unsupported_action' });

  const code = String(req.query?.code ?? '');
  const returnedState = String(req.query?.state ?? '');
  const cookies = parseCookies(req.headers.cookie);
  if (!code || !returnedState || cookies.allegro_oauth_state !== returnedState) return res.status(400).json({ error: 'invalid_oauth_state_or_code' });

  const basic = Buffer.from(clientId + ':' + clientSecret).toString('base64');
  const response = await fetch(AUTH_BASE + '/token', {
    method: 'POST',
    headers: { Authorization: 'Basic ' + basic, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: redirectUri }),
  });
  if (!response.ok) return res.status(response.status).send(await response.text());

  const token = await response.json();
  const session = seal(JSON.stringify({ accessToken: token.access_token, refreshToken: token.refresh_token ?? null, expiresAt: Date.now() + Number(token.expires_in ?? 43200) * 1000 }));
  res.setHeader('Set-Cookie', [
    `allegro_session=${session}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`,
    'allegro_oauth_state=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0',
  ]);
  return res.redirect(302, '/?allegro=connected');
}
