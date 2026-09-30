import type { Deal } from './deal';

export type SourceHealth = 'healthy' | 'degraded' | 'offline';

export type Source = {
  id: string;
  name: string;
  type: 'MOCK' | 'API' | 'PUBLIC_FEED' | 'PUBLIC_PAGE';
  health: SourceHealth;
  lastScan?: string;
  responseTimeMs?: number;
};

export type ScanResult = {
  source: Source;
  deals: Deal[];
  durationMs: number;
  errors: string[];
  completedAt?: string;
};

export interface SourceAdapter {
  readonly source: Source;
  scan(query?: string): Promise<ScanResult>;
}
