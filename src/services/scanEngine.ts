import type { DealAnalysis } from '../domain/deal';
import type { SourceAdapter } from '../domain/source';
import { analyzeDeal } from './dealEngine';
import { dedupeOffers } from './normalization/offerNormalizer';

export type ScanSummary = {
  deals: DealAnalysis[];
  sourcesScanned: number;
  offersFound: number;
  rawOffersFound: number;
  duplicatesRemoved: number;
  durationMs: number;
  errors: string[];
};

export async function runScan(adapters: SourceAdapter[]): Promise<ScanSummary> {
  const started = Date.now();
  const results = await Promise.allSettled(adapters.map(adapter => adapter.scan()));
  const errors: string[] = [];
  const raw = results.flatMap(result => {
    if (result.status === 'fulfilled') {
      errors.push(...result.value.errors);
      return result.value.deals;
    }
    errors.push(result.reason instanceof Error ? result.reason.message : 'Unknown source error');
    return [];
  });
  const normalized = dedupeOffers(raw);
  const deals = normalized.map(analyzeDeal).sort((a, b) => b.score - a.score);
  return {
    deals,
    sourcesScanned: adapters.length,
    offersFound: normalized.length,
    rawOffersFound: raw.length,
    duplicatesRemoved: raw.length - normalized.length,
    durationMs: Date.now() - started,
    errors,
  };
}
