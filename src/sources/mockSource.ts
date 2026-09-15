import type { ScanResult, SourceAdapter } from '../domain/source';
import { generateMarketSimulation } from '../services/simulation/marketSimulator';

export const mockSource: SourceAdapter = {
  source: {
    id: 'simulation-market',
    name: 'Synthetic Market Lab',
    type: 'MOCK',
    health: 'healthy',
  },
  async scan(): Promise<ScanResult> {
    const started = performance.now();
    await new Promise(resolve => setTimeout(resolve, 260));
    return {
      source: this.source,
      deals: generateMarketSimulation(250),
      durationMs: Math.round(performance.now() - started),
      errors: [],
    };
  },
};
