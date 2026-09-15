import type { SourceAdapter } from '../../domain/source';
import { mockSource } from '../../sources/mockSource';

export type SourceRegistryEntry = {
  adapter: SourceAdapter;
  enabled: boolean;
  priority: number;
};

const registry: SourceRegistryEntry[] = [
  { adapter: mockSource, enabled: true, priority: 1 },
];

export function getEnabledSources(): SourceAdapter[] {
  return registry
    .filter(entry => entry.enabled && entry.adapter.source.health !== 'offline')
    .sort((a, b) => a.priority - b.priority)
    .map(entry => entry.adapter);
}

export function getSourceRegistry(): readonly SourceRegistryEntry[] {
  return registry;
}
