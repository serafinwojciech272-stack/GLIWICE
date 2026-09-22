export type MarketplaceId = 'allegro'|'ebay'|'amazon'|'olx'|'temu'|'ceneo'|'erli'|'empik'|'kaufland';
export type MarketplaceMode = 'live-search'|'account'|'benchmark'|'unconfigured';
export type MarketplaceStatus = 'configured'|'missing-credentials'|'not-implemented';
export type MarketplaceHealth = { id: MarketplaceId; name: string; mode: MarketplaceMode; status: MarketplaceStatus; configured: boolean; message: string };
export type MarketplaceSearchRequest = { q: string; limit?: number; marketplace?: MarketplaceId };
export type MarketplaceSearchResponse = { query: string; results: unknown[]; sources: MarketplaceHealth[]; generatedAt: string };