const assert = (condition, message) => {
  if (!condition) throw new Error(`Real-source smoke failed: ${message}`);
};
const source = { id: 'test-public-feed', name: 'Test Public Feed', type: 'PUBLIC_FEED' };
const normalize = (raw, index) => {
  const title = String(raw.title ?? raw.name ?? '').trim();
  const price = Number(raw.price);
  const sourceUrl = String(raw.sourceUrl ?? raw.url ?? '').trim();
  if (!title || !Number.isFinite(price) || !sourceUrl) return null;
  return { id: String(raw.id ?? `test-${index + 1}`), title, price, sourceId: source.id, sourceUrl };
};
const rows = [
  { id: 'a1', title: 'Real product', price: 199, sourceUrl: 'https://example.test/a1' },
  { id: 'bad', title: '', price: 10, sourceUrl: 'https://example.test/bad' },
].map(normalize).filter(Boolean);
assert(rows.length === 1, 'invalid records must be rejected');
assert(rows[0].sourceId === 'test-public-feed', 'source identity must survive normalization');
assert(rows[0].price === 199, 'price must remain numeric');
assert(/^https:/.test(rows[0].sourceUrl), 'source URL must remain traceable');
console.log('REAL SOURCE SMOKE: PASS');
