import type { ScanResult, SourceAdapter } from '../domain/source';
import { mapAllegroListing } from '../server/allegroMapper';

export function createAllegroSource(phrase: string): SourceAdapter {
  const source = { id: 'allegro', name: 'Allegro Sandbox', type: 'API' as const, health: 'degraded' as const };
  return {
    source,
    async scan(query?: string): Promise<ScanResult> {
      const started = Date.now();
      const effectivePhrase = (query?.trim() || phrase.trim());
      if (!effectivePhrase) return { source: { ...source, health: 'offline', lastScan: new Date().toISOString(), responseTimeMs: Date.now() - started }, deals: [], durationMs: Date.now() - started, errors: ['Wpisz produkt do wyszukania albo skonfiguruj ALLEGRO_SEARCH_PHRASE.'] };
      try {
        const apiBase = String(import.meta.env.VITE_MARKETPLACE_API_URL || 'https://extra-szpieg-api.onrender.com').replace(/\/$/, '');
        const response = await fetch(apiBase + '/api/marketplaces/search?q=' + encodeURIComponent(effectivePhrase) + '&limit=50&marketplace=allegro', { credentials: 'include' });
        if (!response.ok) throw new Error('Allegro gateway HTTP ' + response.status);
        const payload = await response.json() as Record<string, any>;
        if (typeof payload.message === 'string' && (!Array.isArray(payload.results) || payload.results.length === 0)) throw new Error(payload.message);
        const deals = Array.isArray(payload.results) ? mapAllegroListing({ offers: payload.results }) : mapAllegroListing(payload);
        return { source: { ...source, health: 'healthy', lastScan: new Date().toISOString(), responseTimeMs: Date.now() - started }, deals, durationMs: Date.now() - started, errors: [] };
      } catch (error) {
        return { source: { ...source, health: 'offline', lastScan: new Date().toISOString(), responseTimeMs: Date.now() - started }, deals: [], durationMs: Date.now() - started, errors: [error instanceof Error ? error.message : 'Allegro source failed'] };
      }
    },
  };
}
