import type { SourceAdapter } from '../domain/source';
import { createPublicJsonSource } from './publicJsonSource';

const realSourceUrl = (import.meta.env.VITE_REAL_SOURCE_URL ?? '').trim();

export function getSourceAdapters(): SourceAdapter[] {
  return [createPublicJsonSource({ id: 'real-public-feed', name: 'Real Public Feed', url: realSourceUrl })];
}
