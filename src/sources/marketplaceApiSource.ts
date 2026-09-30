import type { Deal } from '../domain/deal';
import type { ScanResult, SourceAdapter } from '../domain/source';
import { MarketplaceContractError, parseMarketplaceSearchResponse } from './marketplaceGatewayContract';

const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {};
const api = String(env.VITE_MARKETPLACE_API_URL || 'https://extra-szpieg-api.onrender.com').replace(/\/$/, '');
const phrase = String(env.VITE_MARKETPLACE_SEARCH_PHRASE || env.VITE_ALLEGRO_SEARCH_PHRASE || '').trim();
const requestedMarketplace = String(env.VITE_MARKETPLACE || '').trim();

export function createMarketplaceApiSource(): SourceAdapter {
  const base = { id: 'marketplace-gateway', name: 'Marketplace Gateway', type: 'API' as const, health: 'degraded' as const };
  return {
    source: base,
    async scan(query?: string): Promise<ScanResult> {
      const started = Date.now();
      const effectiveQuery = query?.trim() || phrase;
      if (!effectiveQuery) {
        return {
          source: { ...base, health: 'offline', lastScan: new Date().toISOString(), responseTimeMs: Date.now() - started },
          deals: [],
          durationMs: Date.now() - started,
          errors: ['Wpisz produkt do wyszukania albo skonfiguruj VITE_MARKETPLACE_SEARCH_PHRASE.'],
        };
      }
      try {
        const url = api + '/api/marketplaces/search?q=' + encodeURIComponent(effectiveQuery) + '&limit=50' + (requestedMarketplace ? '&marketplace=' + encodeURIComponent(requestedMarketplace) : '');
        const response = await fetch(url);
        if (!response.ok) throw new Error('Marketplace gateway HTTP ' + response.status + ' (' + response.statusText + ')');

        let payload: unknown;
        try {
          payload = await response.json();
        } catch {
          throw new Error('Marketplace gateway returned malformed JSON.');
        }

        const parsed = parseMarketplaceSearchResponse(payload);
        const deals: Deal[] = parsed.results;
        return {
          source: { ...base, health: deals.length ? 'healthy' : 'degraded', lastScan: new Date().toISOString(), responseTimeMs: Date.now() - started },
          deals,
          durationMs: Date.now() - started,
          errors: deals.length ? [] : [parsed.message || 'No live marketplace results configured.'],
        };
      } catch (error) {
        const message = error instanceof MarketplaceContractError
          ? 'Marketplace gateway contract violation (' + error.kind + '): ' + error.message
          : error instanceof Error ? error.message : 'Marketplace gateway failed';
        return {
          source: { ...base, health: 'offline', lastScan: new Date().toISOString(), responseTimeMs: Date.now() - started },
          deals: [],
          durationMs: Date.now() - started,
          errors: [message],
        };
      }
    },
  };
}
