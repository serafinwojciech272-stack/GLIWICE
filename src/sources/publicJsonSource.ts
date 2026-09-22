import type { Deal } from '../domain/deal';
import type { ScanResult, SourceAdapter } from '../domain/source';

type JsonOffer = Record<string, unknown>;
type PublicJsonSourceOptions = { id: string; name: string; url: string; fetchImpl?: typeof fetch };

const text = (value: unknown) => typeof value === 'string' ? value.trim() : '';
const number = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? value : Number(value);
const finite = (value: unknown) => { const n = number(value); return Number.isFinite(n) ? n : undefined; };

function toAvailability(value: unknown): Deal['availability'] {
  const v = text(value).toLowerCase();
  if (['in_stock','in stock','available','available_now'].includes(v)) return 'in_stock';
  if (['limited','low_stock','low stock'].includes(v)) return 'limited';
  if (['out_of_stock','out of stock','unavailable'].includes(v)) return 'out_of_stock';
  return 'unknown';
}
function toCondition(value: unknown): Deal['condition'] {
  const v = text(value).toLowerCase();
  if (['new','nowy'].includes(v)) return 'new';
  if (['used','używany','uzywany'].includes(v)) return 'used';
  if (['refurbished','odnowiony'].includes(v)) return 'refurbished';
  if (['open_box','open box'].includes(v)) return 'open_box';
  return 'unknown';
}
function normalizeOffer(raw: JsonOffer, sourceId: string, index: number): Deal | null {
  const id = text(raw.id) || text(raw.offerId) || text(raw.productId) || `${sourceId}-${index + 1}`;
  const title = text(raw.title) || text(raw.name) || text(raw.productName);
  const priceValue = raw.price && typeof raw.price === 'object' ? (raw.price as JsonOffer).amount : raw.price;
  const price = finite(priceValue);
  const sourceUrl = text(raw.sourceUrl) || text(raw.url) || text(raw.link);
  if (!title || price === undefined || !sourceUrl) return null;
  return {
    id, productId: text(raw.productId) || id, ean: text(raw.ean) || undefined, sku: text(raw.sku) || undefined,
    title, brand: text(raw.brand) || undefined, model: text(raw.model) || undefined,
    attributes: typeof raw.attributes === 'object' && raw.attributes !== null ? raw.attributes as Record<string, string | number | boolean> : undefined,
    store: text(raw.store) || text(raw.seller) || 'Unknown source', category: text(raw.category) || 'Other',
    price, previousPrice: finite(raw.previousPrice), marketMedian: finite(raw.marketMedian),
    historicalMedian90d: finite(raw.historicalMedian90d), estimatedResalePrice: finite(raw.estimatedResalePrice),
    shippingIn: finite(raw.shippingIn ?? raw.shipping), condition: toCondition(raw.condition),
    availability: toAvailability(raw.availability ?? raw.stock), sellerRating: finite(raw.sellerRating),
    sourceId, sourceUrl, observedAt: text(raw.observedAt) || text(raw.updatedAt) || new Date().toISOString(),
  };
}
export function createPublicJsonSource(options: PublicJsonSourceOptions): SourceAdapter {
  const base = { id: options.id, name: options.name, type: 'PUBLIC_FEED' as const, health: 'degraded' as const };
  const fetchImpl = options.fetchImpl ?? fetch;
  return {
    source: base,
    async scan(): Promise<ScanResult> {
      const started = Date.now();
      if (!options.url) return { source: { ...base, health: 'offline', lastScan: new Date().toISOString(), responseTimeMs: Date.now() - started }, deals: [], durationMs: Date.now() - started, errors: ['Real source URL is not configured. Set VITE_REAL_SOURCE_URL.'] };
      try {
        const response = await fetchImpl(options.url, { headers: { Accept: 'application/json' } });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload = await response.json() as unknown;
        const objectPayload = payload && typeof payload === 'object' ? payload as JsonOffer : null;
        const rows: JsonOffer[] = Array.isArray(payload) ? payload : Array.isArray(objectPayload?.deals) ? objectPayload.deals as JsonOffer[] : Array.isArray(objectPayload?.offers) ? objectPayload.offers as JsonOffer[] : [];
        const deals = rows.map((row, index) => normalizeOffer(row, options.id, index)).filter((deal): deal is Deal => Boolean(deal));
        const errors = deals.length === rows.length ? [] : [`Skipped ${rows.length - deals.length} invalid offer records.`];
        return { source: { ...base, health: errors.length ? 'degraded' : 'healthy', lastScan: new Date().toISOString(), responseTimeMs: Date.now() - started }, deals, durationMs: Date.now() - started, errors };
      } catch (error) {
        return { source: { ...base, health: 'offline', lastScan: new Date().toISOString(), responseTimeMs: Date.now() - started }, deals: [], durationMs: Date.now() - started, errors: [error instanceof Error ? error.message : 'Real source request failed'] };
      }
    },
  };
}
