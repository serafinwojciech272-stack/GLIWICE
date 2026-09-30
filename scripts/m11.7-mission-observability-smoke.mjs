import { runMassDiscovery } from '../server/massDiscovery.mjs';

const result = await runMassDiscovery({
  profiles: [{ id: 'smoke', query: 'test' }],
  perQuery: 1,
  maxResults: 10,
  search: async () => ({ results: [{
    id: 'deal-smoke', title: 'Test product', store: 'Amazon', sourceId: 'amazon',
    sourceUrl: 'https://example.com/test', price: 50, observedAt: new Date().toISOString(),
    condition: 'new', availability: 'in_stock', ean: '5901234567890',
    marketMedian: 100, marketSampleSize: 2, marketSources: ['amazon','ceneo']
  }], providers: ['amazon'] }),
});
if (!result.pipeline || !result.missionStats) throw new Error('mission observability missing');
if (!Number.isInteger(result.missionStats.total)) throw new Error('mission total missing');
if (result.missionStats.total !== result.results.length) throw new Error('mission total mismatch');
if (!result.decisionStats || typeof result.decisionStats.BUY !== 'number') throw new Error('decision stats missing');
console.log('M11.7 MISSION OBSERVABILITY SMOKE PASS');
