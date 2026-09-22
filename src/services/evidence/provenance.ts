import type { DealAnalysis, DealEvidence, EvidenceKind } from '../../domain/deal';

export type ProvenanceStatus = 'verified' | 'calculated' | 'estimated' | 'inferred' | 'missing';

export type EvidenceSummary = {
  status: ProvenanceStatus;
  observedCount: number;
  calculatedCount: number;
  estimatedCount: number;
  inferredCount: number;
  missingSourceCount: number;
  confidence: number;
};

const statusFor = (kind: EvidenceKind): ProvenanceStatus =>
  kind === 'observed' ? 'verified' :
  kind === 'calculated' ? 'calculated' :
  kind === 'estimated' ? 'estimated' : 'inferred';

export function summarizeEvidence(deal: DealAnalysis): EvidenceSummary {
  const evidence: DealEvidence[] = Array.isArray(deal.evidence) ? deal.evidence : [];
  const observedCount = evidence.filter(e => e.kind === 'observed').length;
  const calculatedCount = evidence.filter(e => e.kind === 'calculated').length;
  const estimatedCount = evidence.filter(e => e.kind === 'estimated').length;
  const inferredCount = evidence.filter(e => e.kind === 'ai_inferred').length;
  const missingSourceCount = evidence.filter(e => e.kind === 'observed' && !e.sourceId && !deal.sourceId).length;
  const confidence = evidence.length
    ? Math.round(evidence.reduce((sum, e) => sum + (typeof e.confidence === 'number' ? e.confidence : e.kind === 'observed' ? 100 : 60), 0) / evidence.length)
    : 0;
  const status: ProvenanceStatus =
    !evidence.length || missingSourceCount > 0 ? 'missing' :
    inferredCount > 0 && observedCount === 0 ? 'inferred' :
    evidence.some(e => e.kind === 'estimated') ? 'estimated' :
    evidence.some(e => e.kind === 'calculated') ? 'calculated' : 'verified';
  return { status, observedCount, calculatedCount, estimatedCount, inferredCount, missingSourceCount, confidence };
}

export function provenanceLabel(status: ProvenanceStatus): string {
  return {
    verified: 'VERIFIED',
    calculated: 'CALCULATED',
    estimated: 'ESTIMATED',
    inferred: 'AI INFERRED',
    missing: 'MISSING EVIDENCE',
  }[status];
}

export function sourceTruthLabel(sourceType: string): string {
  return ['MOCK', 'simulation-market'].includes(sourceType) ? 'SIMULATED SOURCE' : 'EXTERNAL SOURCE';
}

export function isActionableEvidence(deal: DealAnalysis): boolean {
  const summary = summarizeEvidence(deal);
  return summary.status !== 'missing' && summary.confidence >= 60;
}

export { statusFor };
