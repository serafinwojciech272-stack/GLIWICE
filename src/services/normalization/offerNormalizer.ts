import type { Deal } from '../../domain/deal';

const normalize = (value: string) => value
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

export function canonicalOfferKey(deal: Deal): string {
  if (deal.ean) return `ean:${normalize(deal.ean)}`;
  if (deal.sku) return `sku:${normalize(deal.sku)}`;
  return `product:${normalize(deal.brand ?? '')}:${normalize(deal.model ?? '')}:${normalize(deal.title)}`;
}

export function normalizeDeal(deal: Deal): Deal {
  return {
    ...deal,
    title: deal.title.trim(),
    brand: deal.brand?.trim(),
    model: deal.model?.trim(),
    store: deal.store.trim(),
    category: deal.category.trim(),
    price: Number.isFinite(deal.price) ? Math.max(0, deal.price) : 0,
    shippingIn: Number.isFinite(deal.shippingIn ?? 0) ? Math.max(0, deal.shippingIn ?? 0) : 0,
  };
}

export function dedupeOffers(deals: Deal[]): Deal[] {
  const byKey = new Map<string, Deal>();
  for (const raw of deals) {
    const deal = normalizeDeal(raw);
    const key = `${deal.sourceId ?? 'unknown'}:${canonicalOfferKey(deal)}:${normalize(deal.store)}:${deal.price}:${deal.availability}`;
    const existing = byKey.get(key);
    if (!existing || Date.parse(deal.observedAt) > Date.parse(existing.observedAt)) byKey.set(key, deal);
  }
  return [...byKey.values()];
}
