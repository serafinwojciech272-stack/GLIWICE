import type { SourceAdapter } from '../domain/source';
import { createAllegroSource } from './allegroSource';
import { createPublicJsonSource } from './publicJsonSource';

const realSourceUrl = (import.meta.env.VITE_REAL_SOURCE_URL ?? '').trim();
const allegroPhrase = (import.meta.env.VITE_ALLEGRO_SEARCH_PHRASE ?? '').trim();

export function getSourceAdapters(): SourceAdapter[] {
  return [
    createAllegroSource(allegroPhrase),
    createPublicJsonSource({ id: 'real-public-feed', name: 'Real Public Feed', url: realSourceUrl }),
  ];
}
