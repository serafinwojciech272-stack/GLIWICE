import { decideOpportunity } from '../decision/opportunityEngine';
import { summarizeEvidence, isActionableEvidence } from '../evidence/provenance';
import { buildAlerts } from '../alerts/alertEngine';
import type { DealAnalysis } from '../../domain/deal';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`E2E smoke failed: ${message}`);
}

export function runCoreSmoke(deal: DealAnalysis): { decision: string; alerts: number; provenance: string } {
  const decision = decideOpportunity(deal);
  const provenance = summarizeEvidence(deal);
  const alerts = buildAlerts([deal]);
  assert(Number.isFinite(decision.buyScore), 'decision score must be finite');
  assert(provenance.status !== 'missing', 'deal must have evidence');
  assert(isActionableEvidence(deal), 'evidence must be actionable');
  assert(alerts.every(alert => alert.dealId === deal.id), 'alerts must reference the deal');
  return { decision: decision.decision, alerts: alerts.length, provenance: provenance.status };
}
