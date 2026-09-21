import { buildAlerts } from '../src/services/alerts/alertEngine.ts';

const deal = {
  id: 'smoke-1', productId: 'smoke', title: 'Smoke Deal', store: 'Smoke Store',
  category: 'Audio', price: 100, marketMedian: 160, estimatedResalePrice: 150,
  condition: 'new', availability: 'in_stock', sellerRating: 4.8, sourceUrl: 'https://example.com',
  observedAt: new Date().toISOString(), discountPct: 37.5, marketAdvantagePct: 37.5,
  historicalAdvantagePct: 20, totalCost: 105, potentialProfit: 45, marginPct: 30,
  roiPct: 42.8, score: 92, confidence: 90, riskScore: 10, risk: 'low',
  verdict: 'STRONG BUY', reasons: ['smoke'], evidence: [
    {kind:'observed', label:'price', value:'100', sourceId:'smoke', confidence:100},
    {kind:'calculated', label:'ROI', value:'42.8%', confidence:90}
  ]
};
const alerts = buildAlerts([deal]);
if (!alerts.length) throw new Error('Smoke failed: expected alerts');
console.log('SMOKE PASS', alerts.length);
