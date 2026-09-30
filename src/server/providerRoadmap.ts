import type { MarketplaceId } from './marketplaceTypes';

export type ProviderRoadmapState =
  | 'available'
  | 'configured'
  | 'implemented'
  | 'not-implemented'
  | 'requires-api-access'
  | 'requires-partnership'
  | 'not-suitable';

export type ProviderRoadmapEntry = {
  id: MarketplaceId;
  state: ProviderRoadmapState;
  notes: string;
};

/**
 * Mirrors server/providers.mjs ROADMAP. Update both when provider strategy changes.
 * eBay is classified not-suitable: permanently removed from product strategy.
 */
export const PROVIDER_ROADMAP: ProviderRoadmapEntry[] = [
  { id: 'allegro', state: 'implemented', notes: 'Priority provider. OAuth adapter runs in the Vercel serverless API (/api/allegro/*). Sandbox/production switch via ALLEGRO_ENVIRONMENT.' },
  { id: 'ebay', state: 'not-suitable', notes: 'Permanently removed from product strategy. Adapter and mapper retained for reuse only.' },
  { id: 'olx', state: 'requires-partnership', notes: 'Public search API is not offered; requires partner agreement.' },
  { id: 'ceneo', state: 'requires-api-access', notes: 'Useful as a price benchmark; requires commercial API access.' },
  { id: 'amazon', state: 'requires-partnership', notes: 'SP-API requires seller/program authorization.' },
  { id: 'empik', state: 'requires-api-access', notes: 'Seller API access required.' },
  { id: 'temu', state: 'requires-partnership', notes: 'Partner program required.' },
  { id: 'erli', state: 'requires-api-access', notes: 'Marketplace API access required.' },
  { id: 'kaufland', state: 'requires-api-access', notes: 'Seller API access required.' },
];
