const API_BASE = process.env.ALLEGRO_ENVIRONMENT === 'production' ? 'https://api.allegro.pl' : 'https://api.allegro.pl.allegrosandbox.pl';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });
  const token = process.env.ALLEGRO_ACCESS_TOKEN;
  const phrase = String(req.query?.phrase ?? '').trim();
  if (!token) return res.status(503).json({ error: 'allegro_not_configured' });
  if (!phrase) return res.status(400).json({ error: 'phrase_required' });

  const url = new URL(API_BASE + '/offers/listing');
  url.searchParams.set('phrase', phrase);
  url.searchParams.set('limit', String(Math.min(100, Math.max(1, Number(req.query?.limit ?? 20)))));

  const response = await fetch(url, {
    headers: { Authorization: 'Bearer ' + token, Accept: 'application/vnd.allegro.public.v1+json', 'Accept-Language': 'pl-PL' },
  });
  const body = await response.text();
  res.status(response.status).setHeader('Content-Type', 'application/json').send(body);
}
