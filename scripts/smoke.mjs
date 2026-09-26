function buildAlerts(deals) {
  const alerts = [];
  for (const deal of deals) {
    const decision = deal.score >= 82 && deal.risk !== 'critical' && deal.availability !== 'out_of_stock' && deal.roiPct >= 15 && deal.confidence >= 70 ? 'BUY' : 'WATCH';
    if (decision === 'BUY') alerts.push({ type: 'BUY_SIGNAL', dealId: deal.id });
    if (deal.roiPct >= 30) alerts.push({ type: 'HIGH_ROI', dealId: deal.id });
    if (deal.risk === 'high' || deal.risk === 'critical') alerts.push({ type: 'HIGH_RISK', dealId: deal.id });
    if (deal.marketAdvantagePct >= 20) alerts.push({ type: 'PRICE_EDGE', dealId: deal.id });
  }
  return alerts;
}

const deal = {
  id: 'smoke-1', productId: 'smoke', title: 'Smoke Deal', store: 'Smoke Store',
  category: 'Audio', price: 100, marketMedian: 160, estimatedResalePrice: 150,
  condition: 'new', availability: 'in_stock', sellerRating: 4.8, sourceUrl: 'https://example.com',
  observedAt: new Date().toISOString(), discountPct: 37.5, marketAdvantagePct: 37.5,
  historicalAdvantagePct: 20, totalCost: 105, potentialProfit: 45, marginPct: 30,
  roiPct: 42.8, score: 92, confidence: 90, riskScore: 10, risk: 'low',
  verdict: 'STRONG BUY', reasons: ['smoke'],
  evidence: [
    {kind:'observed', label:'price', value:'100', sourceId:'smoke', confidence:100},
    {kind:'calculated', label:'ROI', value:'42.8%', confidence:90}
  ]
};
const alerts = buildAlerts([deal]);
if (!alerts.length) throw new Error('Smoke failed: expected alerts');
console.log('SMOKE PASS', alerts.length);
