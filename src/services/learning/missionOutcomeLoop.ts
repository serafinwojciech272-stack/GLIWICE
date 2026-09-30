import type { DealAnalysis } from '../../domain/deal';
import { loadState, recordMissionOutcome, saveState } from '../persistence/localState';
import { buildAdaptivePolicy, evaluateDecisionOutcome, type PolicyOutcome } from './decisionPolicyLearning';

export type MissionOutcomeInput = {
  missionId: string;
  deal: DealAnalysis;
  outcome: PolicyOutcome;
  realizedRoiPct?: number | null;
  reason?: string;
};

export function executeOutcomeLearning(input: MissionOutcomeInput) {
  const state = loadState();
  const mission = state.missions.find(m => m.missionId === input.missionId);
  if (!mission) throw new Error('Mission not found: ' + input.missionId);
  if (mission.dealId !== input.deal.id) throw new Error('Mission/deal mismatch.');
  if (mission.state !== 'EXECUTING' && mission.state !== 'MISSION_CREATED') throw new Error('Mission is not ready for outcome recording: ' + mission.state);

  const outcome = evaluateDecisionOutcome({ deal: input.deal, decision: mission.decision, realizedRoiPct: input.realizedRoiPct, reason: input.reason });
  const normalized = input.outcome === 'UNRESOLVED' ? outcome : { ...outcome, outcome: input.outcome };
  const outcomes = [...state.outcomes.filter(x => x.dealId !== normalized.dealId), normalized];
  const policy = buildAdaptivePolicy(outcomes);
  saveState({ ...state, outcomes, savedAt: new Date().toISOString() });
  const updatedMission = recordMissionOutcome(input.missionId, {
    outcome: input.outcome,
    realizedRoiPct: input.realizedRoiPct,
    reason: input.reason,
    learning: { version: policy.version, sampleSize: policy.sampleSize, successRate: policy.successRate },
  });
  return { mission: updatedMission, outcome: normalized, policy, outcomeCount: outcomes.length };
}
