import { openSession, parseCookies } from '../../server/allegroSession.mjs';
import { fetchOffersListing } from '../../server/allegroApi.mjs';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });
  const session = openSession(parseCookies(req.headers.cookie).allegro_session);
  if (!session?.accessToken) return res.status(401).json({ error: 'allegro_not_connected' });
  if (session.expiresAt && Date.now() >= session.expiresAt) return res.status(401).json({ error: 'allegro_session_expired' });

  const phrase = String(req.query?.phrase ?? '').trim();
  if (!phrase) return res.status(400).json({ error: 'phrase_required' });

  const response = await fetchOffersListing({
    environment: process.env.ALLEGRO_ENVIRONMENT,
    accessToken: session.accessToken,
    phrase,
    limit: req.query?.limit ?? 20,
  });
  const body = await response.text();
  res.status(response.status).setHeader('Content-Type', 'application/json').send(body);
}
