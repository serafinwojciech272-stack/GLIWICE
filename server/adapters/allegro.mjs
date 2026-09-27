const USER_AGENT = 'Extra-Szpieg/0.3 marketplace-discovery';
const SEARCH_BASE = 'https://allegro.pl/listing';
const clean = value => String(value ?? '').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\\s+/g, ' ').trim();

function priceFrom(text) {
  const m = text.match(/(\\d[\\d\\s.]*(?:,\\d{2})?)\\s*zł/i);
  if (!m) return null;
  const normalized = m[1].replace(/\\s/g, '').replace(/\\./g, '').replace(',', '.');
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

function parseListings(html, limit) {
  const results = [];
  const seen = new Set();
  const re = /<a[^>]+href=["'](\\/oferta\\/[^"']+)["'][^>]*>[\\s\\S]{0,9000}?<h2[^>]*>([\\s\\S]*?)<\\/h2>[\\s\\S]{0,12000}?<\\/a>/gi;
  let match;
  while ((match = re.exec(html)) && results.length < limit) {
    const url = 'https://allegro.pl' + match[1];
    if (seen.has(url)) continue;
    const title = clean(match[2].replace(/<[^>]+>/g, ' '));
    const start = match.index;
    const block = html.slice(start, Math.min(html.length, start + 18000)).replace(/<[^>]+>/g, ' ');
    const price = priceFrom(clean(block));
    if (!title) continue;
    seen.add(url);
    results.push({
      id: 'allegro-web-' + Buffer.from(url).toString('base64url').slice(0, 32),
      productId: 'allegro-web-' + Buffer.from(url).toString('base64url').slice(0, 24),
      title,
      store: 'Allegro',
      category: 'unknown',
      price: price ?? 0,
      condition: 'unknown',
      availability: 'unknown',
      sourceId: 'allegro',
      sourceUrl: url,
      observedAt: new Date().toISOString(),
    });
  }
  return results;
}

export const id = 'allegro';
export function configured() { return true; }
export function authStatus() { return { status: 'configured', connection: 'public-web', detail: null }; }

export async function search(query, limit = 20) {
  const q = String(query || '').trim();
  if (!q) throw new Error('Allegro search query is empty.');
  const url = new URL(SEARCH_BASE);
  url.searchParams.set('string', q);
  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT, 'Accept': 'text/html,application/xhtml+xml' } });
  if (!response.ok) throw new Error('Allegro public search HTTP ' + response.status);
  const html = await response.text();
  const results = parseListings(html, Math.min(50, Math.max(1, Number(limit) || 20)));
  if (!results.length) throw new Error('Allegro public search returned no parseable listings.');
  return results;
}
