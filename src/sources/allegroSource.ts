import type { ScanResult, SourceAdapter } from '../domain/source';
import { mapAllegroListing } from '../server/allegroMapper';

export function createAllegroSource(phrase: string): SourceAdapter {
  const source = { id: 'allegro', name: 'Allegro Sandbox', type: 'API' as const, health: 'degraded' as const };
  return {
    source,
    async scan(): Promise<ScanResult> {
      const started = Date.now();
      if (!phrase.trim()) return { source: { ...source, health: 'offline', lastScan: new Date().toISOString(), responseTimeMs: Date.now() - started }, deals: [], durationMs: Date.now() - started, errors: ['ALLEGRO_SEARCH_PHRASE is not configured.'] };
      try {
        const response = await fetch('/api/allegro/search?phrase=' + encodeURIComponent(phrase));
        if (!response.ok) throw new Error('Allegro gateway HTTP ' + response.status);
        const payload = await response.json() as Record<string, any>;
        const deals = mapAllegroListing(payload);
        return { source: { ...source, health: 'healthy', lastScan: new Date().toISOString(), responseTimeMs: Date.now() - started }, deals, durationMs: Date.now() - started, errors: [] };
      } catch (error) {
        return { source: { ...source, health: 'offline', lastScan: new Date().toISOString(), responseTimeMs: Date.now() - started }, deals: [], durationMs: Date.now() - started, errors: [error instanceof Error ? error.message : 'Allegro source failed'] };
      }
    },
  };
}
