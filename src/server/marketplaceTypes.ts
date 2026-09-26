export type MarketplaceId = 'allegro'|'ebay'|'amazon'|'olx'|'temu'|'ceneo'|'erli'|'empik'|'kaufland';
export type MarketplaceMode = 'live-search'|'account'|'benchmark'|'unconfigured';
export type MarketplaceStatus = 'configured'|'not-configured'|'not-implemented'|'disabled'|'error';
export type MarketplaceHealth = { id: MarketplaceId; name: string; mode: MarketplaceMode; status: MarketplaceStatus; configured: boolean; enabled?: boolean; implemented?: boolean; connection?: string|null; roadmap?: string; message: string };
export type MarketplaceProviderResult = { id: MarketplaceId; status: 'ok'|'error'; resultCount: number; error: string|null };
export type MarketplaceSearchRequest = { q: string; limit?: number; marketplace?: MarketplaceId };
export type MarketplaceSearchResponse = { query: string; results: unknown[]; sources: MarketplaceHealth[]; selectedProvider?: MarketplaceId|null; providers?: MarketplaceProviderResult[]; generatedAt: string; message?: string };