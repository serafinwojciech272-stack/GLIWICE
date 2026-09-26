import type { MarketplaceSearchRequest, MarketplaceSearchResponse } from './marketplaceTypes';
import { marketplaceHealth } from './marketplaceConfig';

/**
 * Server-side search contract. The live gateway (server/index.mjs) performs the actual
 * provider fan-out; this function returns the normalized envelope shape so callers and
 * tests share one contract regardless of which providers are implemented.
 */
export async function searchMarketplaces(request: MarketplaceSearchRequest): Promise<MarketplaceSearchResponse> {
  const q = request.q.trim();
  if (!q) throw new Error('Search query is required.');
  const limit = Math.min(50, Math.max(1, request.limit ?? 20));
  const sources = marketplaceHealth();
  return {
    query: q,
    results: [],
    sources: sources.map(source => ({
      ...source,
      message: source.status === 'disabled'
        ? source.message
        : source.configured
          ? source.message + ' Connector is configured; provider call is the next adapter stage.'
          : source.message + ' Credentials are not configured.',
    })),
    selectedProvider: request.marketplace ?? null,
    providers: [],
    generatedAt: new Date().toISOString(),
    message: 'No live provider adapter is available in this server-side contract path.',
  };
}
