import { mapEbayItemSummaries } from '../ebayMapper.mjs';

const env = key => (process.env[key] || '').trim();
const withTimeout = ms => AbortSignal.timeout(ms);

export const id = 'ebay';

let token = null;
let tokenExpiresAt = 0;

function redact(value, redactFn) {
  return redactFn ? redactFn(value) : String(value == null ? '' : value).slice(0, 240);
}

async function getApplicationToken(redactFn) {
  if (token && Date.now() < tokenExpiresAt - 60000) return token;
  const basic = Buffer.from(env('EBAY_CLIENT_ID') + ':' + env('EBAY_CLIENT_SECRET')).toString('base64');
  const tokenRes = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
    method: 'POST',
    headers: { Authorization: 'Basic ' + basic, 'Content-Type': 'application/x-www-form-urlencoded' },
    signal: withTimeout(10000),
    body: new URLSearchParams({ grant_type: 'client_credentials', scope: 'https://api.ebay.com/oauth/api_scope' }),
  });
  if (!tokenRes.ok) {
    const detail = await tokenRes.text().catch(() => '');
    throw new Error('eBay OAuth HTTP ' + tokenRes.status + (detail ? ' ' + redact(detail, redactFn) : ''));
  }
  const payload = await tokenRes.json();
  if (!payload.access_token) throw new Error('eBay OAuth response missing access_token');
  token = payload.access_token;
  tokenExpiresAt = Date.now() + Number(payload.expires_in || 7200) * 1000;
  return token;
}

export async function search(query, limit, redactFn) {
  const accessToken = await getApplicationToken(redactFn);
  const url = new URL('https://api.ebay.com/buy/browse/v1/item_summary/search');
  url.searchParams.set('q', query);
  url.searchParams.set('limit', String(limit));
  const response = await fetch(url, {
    headers: { Authorization: 'Bearer ' + accessToken, 'Accept-Language': 'pl-PL', 'X-EBAY-C-MARKETPLACE-ID': 'EBAY_PL' },
    signal: withTimeout(12000),
  });
  if (response.status === 401) {
    token = null;
    tokenExpiresAt = 0;
    throw new Error('eBay Browse API HTTP 401; OAuth token rejected');
  }
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error('eBay Browse API HTTP ' + response.status + (detail ? ' ' + redact(detail, redactFn) : ''));
  }
  const data = await response.json();
  return mapEbayItemSummaries(data, new Date().toISOString());
}
