import type { DealAnalysis } from '../domain/deal';
import type { SourceAdapter } from '../domain/source';
import { analyzeDeal } from './dealEngine';
import { dedupeOffers } from './normalization/offerNormalizer';
import { decideOpportunity } from './decision/opportunityEngine';

export type ScanSummary = {
  deals: DealAnalysis[];
  sourcesScanned: number;
  offersFound: number;
  rawOffersFound: number;
  duplicatesRemoved: number;
  durationMs: number;
  errors: string[];
  completedAt: string;
};

export async function runScan(adapters: SourceAdapter[], query?: string): Promise<ScanSummary> {
  const started = Date.now();
  const results = await Promise.allSettled(adapters.map(adapter => adapter.scan(query)));
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
  const deals = normalized.map(analyzeDeal).sort((a, b) => {
    const ao = decideOpportunity(a);
    const bo = decideOpportunity(b);
    return bo.buyScore - ao.buyScore || b.score - a.score;
  });
  return {
    deals,
    sourcesScanned: adapters.length,
    offersFound: normalized.length,
    rawOffersFound: raw.length,
    duplicatesRemoved: raw.length - normalized.length,
    durationMs: Date.now() - started,
    errors,
    completedAt: new Date().toISOString(),
  };
}
