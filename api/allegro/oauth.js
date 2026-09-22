const AUTH_BASE = process.env.ALLEGRO_ENVIRONMENT === 'production' ? 'https://allegro.pl/auth/oauth' : 'https://allegro.pl.allegrosandbox.pl/auth/oauth';

export default async function handler(req, res) {
  const action = String(req.query?.action ?? 'authorize');
  const clientId = process.env.ALLEGRO_CLIENT_ID;
  const clientSecret = process.env.ALLEGRO_CLIENT_SECRET;
  const redirectUri = process.env.ALLEGRO_REDIRECT_URI;
  if (!clientId || !redirectUri) return res.status(503).json({ error: 'allegro_oauth_not_configured' });

  if (action === 'authorize') {
    const state = String(req.query?.state ?? '');
    const url = new URL(AUTH_BASE + '/authorize');
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('state', state);
    url.searchParams.set('scope', 'allegro_api');
    return res.redirect(302, url.toString());
  }

  if (action !== 'token') return res.status(400).json({ error: 'unsupported_action' });
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  if (!clientSecret) return res.status(503).json({ error: 'allegro_client_secret_not_configured' });

  const code = String(req.body?.code ?? '');
  if (!code) return res.status(400).json({ error: 'code_required' });

  const basic = Buffer.from(clientId + ':' + clientSecret).toString('base64');
  const response = await fetch(AUTH_BASE + '/token', {
    method: 'POST',
    headers: { Authorization: 'Basic ' + basic, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: redirectUri }),
  });
  const body = await response.text();
  res.status(response.status).setHeader('Content-Type', 'application/json').send(body);
}
