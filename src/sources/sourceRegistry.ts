import type { SourceAdapter } from '../domain/source';
import { createMarketplaceApiSource } from './marketplaceApiSource';

/**
 * One live source on the client: the marketplace gateway.
 * Provider fan-out belongs to the Render gateway so the browser never
 * duplicates provider traffic or bypasses provider health/rate-limit logic.
 */
export function getSourceAdapters(): SourceAdapter[] {
  return [createMarketplaceApiSource()];
}
