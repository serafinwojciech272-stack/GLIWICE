export function assessDiscoveryQuality(deal) {
  const price = Number(deal?.price);
  const title = String(deal?.title ?? '').trim();
  const sourceUrl = String(deal?.sourceUrl ?? '').trim();
  const sourceId = String(deal?.sourceId ?? '').trim();
  const observedAt = Date.parse(String(deal?.observedAt ?? ''));
  const reasons = [];
  if (!title) reasons.push('missing_title');
  if (!sourceUrl) reasons.push('missing_source_url');
  if (!sourceId) reasons.push('missing_source');
  if (!Number.isFinite(price) || price <= 0) reasons.push('invalid_price');
  if (!Number.isFinite(observedAt)) reasons.push('invalid_observed_at');
  const ageHours = Number.isFinite(observedAt) ? Math.max(0, (Date.now() - observedAt) / 3600000) : Infinity;
  if (ageHours > 72) reasons.push('stale_observation');
  const hasIdentity = Boolean(String(deal?.ean ?? '').trim() || String(deal?.sku ?? '').trim() || (String(deal?.brand ?? '').trim() && String(deal?.model ?? '').trim()));
  if (!hasIdentity) reasons.push('weak_identity');
  const marketMedian = Number(deal?.marketMedian);
  const discount = Number(deal?.discoveryDiscountPct);
  if (Number.isFinite(marketMedian) && marketMedian > 0 && Number.isFinite(price) && price > marketMedian * 1.5) reasons.push('price_outlier_high');
  if (Number.isFinite(discount) && discount > 90) reasons.push('discount_outlier');
  const quality = Math.max(0, 100 - reasons.length * 15 - (hasIdentity ? 0 : 10));
  return { accepted: reasons.length === 0, qualityScore: quality, reasons, ageHours: Number.isFinite(ageHours) ? Number(ageHours.toFixed(1)) : null };
}

export function applyDiscoveryQualityGate(deals) {
  const accepted = [];
  const rejected = [];
  for (const deal of deals) {
    const quality = assessDiscoveryQuality(deal);
    const enriched = { ...deal, discoveryQualityScore: quality.qualityScore, discoveryQualityReasons: quality.reasons, discoveryAccepted: quality.accepted };
    (quality.accepted ? accepted : rejected).push(enriched);
  }
  return { accepted, rejected };
}
