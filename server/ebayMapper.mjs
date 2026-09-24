const AVAILABILITY_VALUES = ['in_stock', 'limited', 'out_of_stock', 'unknown'];

function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function toAvailability(estimatedAvailabilities) {
  if (!Array.isArray(estimatedAvailabilities) || !estimatedAvailabilities.length) return 'unknown';
  const inStock = estimatedAvailabilities.some(entry => entry && entry.availabilityThresholdType === 'MORE_THAN');
  if (inStock) return 'in_stock';
  const any = estimatedAvailabilities.some(entry => entry && typeof entry === 'object');
  return any ? 'limited' : 'unknown';
}

function toCondition(condition) {
  const value = text(condition).toLowerCase();
  return value.includes('new') ? 'new' : 'unknown';
}

/** Maps one eBay Buy Browse itemSummary into the existing Deal domain shape. Returns null when unusable. */
export function mapEbayItem(item, observedAt) {
  if (!item || typeof item !== 'object') return null;
  const itemId = text(item.itemId);
  const title = text(item.title);
  const sourceUrl = text(item.itemWebUrl) || text(item.itemAffiliateWebUrl);
  const price = Number(item.price?.value);
  if (!itemId || !title || !sourceUrl || !Number.isFinite(price) || price < 0) return null;
  const shipping = Number(item.shippingOptions?.[0]?.shippingCost?.value);
  return {
    id: 'ebay:' + itemId,
    productId: text(item.epid) || itemId,
    title,
    store: 'eBay',
    category: text(item.categories?.[0]?.categoryName) || 'eBay',
    condition: toCondition(item.condition),
    availability: toAvailability(item.estimatedAvailabilities),
    price,
    sourceId: 'ebay',
    sourceUrl,
    observedAt: typeof observedAt === 'string' && observedAt ? observedAt : new Date().toISOString(),
    shippingIn: Number.isFinite(shipping) && shipping >= 0 ? shipping : 0,
  };
}

export function mapEbayItemSummaries(data, observedAt) {
  const summaries = data && Array.isArray(data.itemSummaries) ? data.itemSummaries : [];
  const when = typeof observedAt === 'string' && observedAt ? observedAt : new Date().toISOString();
  return summaries.map(item => mapEbayItem(item, when)).filter(deal => deal !== null);
}

export function validateAvailability(value) {
  const candidate = text(value).toLowerCase();
  return AVAILABILITY_VALUES.includes(candidate) ? candidate : 'unknown';
}
