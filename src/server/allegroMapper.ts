import type { Deal } from '../domain/deal';

type AllegroOffer = Record<string, any>;

const money = (value: unknown) => {
  if (typeof value === 'object' && value !== null) return Number((value as Record<string, unknown>).amount);
  return Number(value);
};

export function mapAllegroOffer(raw: AllegroOffer, observedAt = new Date().toISOString()): Deal | null {
  const id = String(raw.id ?? '').trim();
  const title = String(raw.name ?? raw.title ?? '').trim();
  const price = money(raw.sellingMode?.price ?? raw.price);
  const url = String(raw.url ?? '').trim();
  if (!id || !title || !Number.isFinite(price)) return null;

  const product = raw.product ?? {};
  const ean = String(product.ean ?? raw.ean ?? '').trim() || undefined;
  const stock = Number(raw.stock?.available ?? raw.stock?.quantity);
  const publication = String(raw.publication?.status ?? '').toUpperCase();

  return {
    id: 'allegro:' + id,
    productId: String(product.id ?? id),
    ean,
    sku: String(raw.external?.id ?? '').trim() || undefined,
    title,
    brand: String(product.brand ?? raw.brand ?? '').trim() || undefined,
    model: String(product.model ?? raw.model ?? '').trim() || undefined,
    store: 'Allegro',
    category: String(raw.category?.name ?? 'Allegro').trim(),
    price,
    availability: stock > 0 ? 'in_stock' : publication === 'ACTIVE' ? 'unknown' : 'out_of_stock',
    condition: 'unknown',
    sellerRating: undefined,
    sourceId: 'allegro',
    sourceUrl: url || 'https://allegro.pl/',
    observedAt,
  };
}

export function mapAllegroListing(payload: Record<string, any>): Deal[] {
  const rows: AllegroOffer[] = Array.isArray(payload.items?.regular) ? payload.items.regular as AllegroOffer[] : [];
  const observedAt = new Date().toISOString();
  return rows.map((row: AllegroOffer) => mapAllegroOffer(row, observedAt)).filter((deal: Deal | null): deal is Deal => Boolean(deal));
}
