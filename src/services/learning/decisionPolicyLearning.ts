import type { DealAnalysis } from '../../domain/deal';

export type PolicyOutcome = 'SUCCESS' | 'FAILURE' | 'UNRESOLVED';

export type DecisionOutcome = {
  id: string;
  dealId: string;
  decision: 'BUY' | 'WATCH' | 'PASS';
  outcome: PolicyOutcome;
  realizedRoiPct: number | null;
  observedAt: string;
  reason: string;
};

export type AdaptivePolicy = {
  version: 'm9.8-policy-learning-v1';
  actionThreshold: number;
  evidenceThreshold: number;
  roiThreshold: number;
  riskCeiling: 'low' | 'medium' | 'high';
  confidenceThreshold: number;
  explorationRate: number;
  sampleSize: number;
  successRate: number | null;
  recentSuccessRate: number | null;
  calibration: 'NO_DATA' | 'EARLY' | 'LEARNING' | 'STABLE';
  rationale: string[];
};

const clamp=(n:number,min=0,max=100)=>Math.max(min,Math.min(max,n));

export function buildAdaptivePolicy(outcomes: DecisionOutcome[]=[]): AdaptivePolicy {
  const resolved=outcomes.filter(o=>o.outcome!=='UNRESOLVED');
  const wins=resolved.filter(o=>o.outcome==='SUCCESS').length;
  const successRate=resolved.length?wins/resolved.length:null;
  const recent=resolved.slice(-10);
  const recentSuccessRate=recent.length?recent.filter(o=>o.outcome==='SUCCESS').length/recent.length:null;

  let actionThreshold=82;
  let evidenceThreshold=70;
  let roiThreshold=15;
  let riskCeiling:'low'|'medium'|'high'='high';
  let confidenceThreshold=70;
  let explorationRate=.15;
  const rationale:string[]=[];

  const calibration:AdaptivePolicy['calibration'] =
    resolved.length===0?'NO_DATA':resolved.length<10?'EARLY':resolved.length<30?'LEARNING':'STABLE';

  if (resolved.length<5) {
    rationale.push('Brak wystarczającej historii outcomeów — polityka pozostaje ostrożna.');
    actionThreshold=85; evidenceThreshold=75; confidenceThreshold=75; explorationRate=.2;
  } else if ((recentSuccessRate??0)<.4) {
    rationale.push('Recent success rate spadł poniżej 40% — zwiększono rygor decyzji.');
    actionThreshold=90; evidenceThreshold=82; roiThreshold=20; riskCeiling='medium'; confidenceThreshold=82; explorationRate=.05;
  } else if ((successRate??0)>=.7 && resolved.length>=15) {
    rationale.push('Historia outcomeów wspiera łagodniejsze progi dla dobrze udokumentowanych okazji.');
    actionThreshold=78; evidenceThreshold=65; roiThreshold=12; confidenceThreshold=65; explorationRate=.18;
  } else {
    rationale.push('Historia jest użyteczna, ale niewystarczająca do agresywnej adaptacji.');
    actionThreshold=82; evidenceThreshold=70; confidenceThreshold=70;
  }

  return {
    version:'m9.8-policy-learning-v1',
    actionThreshold,evidenceThreshold,roiThreshold,riskCeiling,confidenceThreshold,
    explorationRate,sampleSize:resolved.length,
    successRate:successRate===null?null:Number(successRate.toFixed(3)),
    recentSuccessRate:recentSuccessRate===null?null:Number(recentSuccessRate.toFixed(3)),
    calibration,rationale,
  };
}

export function evaluateDecisionOutcome(input:{
  deal:DealAnalysis;
  decision:'BUY'|'WATCH'|'PASS';
  realizedRoiPct?:number|null;
  reason?:string;
}):DecisionOutcome {
  const roi=input.realizedRoiPct??null;
  const outcome =
    roi===null ? 'UNRESOLVED' :
    input.decision==='PASS' ? (roi<=0?'SUCCESS':'FAILURE') :
    input.decision==='BUY' ? (roi>=0?'SUCCESS':'FAILURE') :
    (roi>=input.deal.roiPct?'SUCCESS':'FAILURE');
  return {
    id:crypto.randomUUID(),
    dealId:input.deal.id,
    decision:input.decision,
    outcome,
    realizedRoiPct:roi,
    observedAt:new Date().toISOString(),
    reason:input.reason??'Outcome recorded from subsequent market observation.',
  };
}

export function policyAccepts(deal:DealAnalysis, policy:AdaptivePolicy):boolean {
  const riskRank={low:0,medium:1,high:2,critical:3} as const;
  if (deal.risk==='critical'||riskRank[deal.risk]>riskRank[policy.riskCeiling]) return false;
  if (deal.score<policy.actionThreshold) return false;
  if (deal.confidence<policy.confidenceThreshold) return false;
  if (deal.confidence<policy.evidenceThreshold) return false;
  if (deal.roiPct<policy.roiThreshold) return false;
  return true;
}
