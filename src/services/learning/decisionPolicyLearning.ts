import type { DealAnalysis } from '../../domain/deal';

export type PolicyOutcome = 'SUCCESS' | 'FAILURE' | 'UNRESOLVED';

export type DecisionOutcome = {
  id: string; dealId: string; decision: 'BUY'|'WATCH'|'PASS'; outcome: PolicyOutcome;
  realizedRoiPct: number|null; observedAt: string; reason: string;
  category?: string; sourceId?: string; risk?: DealAnalysis['risk']; expectedRoiPct?: number;
};

export type PolicyMemorySlice = {
  key: string; sampleSize: number; successRate: number|null;
  recentSuccessRate: number|null; avgRealizedRoiPct: number|null;
};

export type PolicyMemory = {
  version: 'm9.9-cross-deal-memory-v1';
  global: PolicyMemorySlice; byCategory: PolicyMemorySlice[];
  bySource: PolicyMemorySlice[]; byDecision: PolicyMemorySlice[];
  transferConfidence: number; rationale: string[];
};

export type AdaptivePolicy = {
  version: 'm9.8-policy-learning-v1'; actionThreshold:number; evidenceThreshold:number; roiThreshold:number;
  riskCeiling:'low'|'medium'|'high'; confidenceThreshold:number; explorationRate:number;
  sampleSize:number; successRate:number|null; recentSuccessRate:number|null;
  calibration:'NO_DATA'|'EARLY'|'LEARNING'|'STABLE'; rationale:string[]; memory?:PolicyMemory;
};

const clamp=(n:number,min=0,max=100)=>Math.max(min,Math.min(max,n));
const resolved=(o:DecisionOutcome[])=>o.filter(x=>x.outcome!=='UNRESOLVED');

function makeSlice(key:string, items:DecisionOutcome[]):PolicyMemorySlice {
  const r=resolved(items), wins=r.filter(o=>o.outcome==='SUCCESS').length, recent=r.slice(-10);
  const rois=r.map(o=>o.realizedRoiPct).filter((v):v is number=>typeof v==='number'&&Number.isFinite(v));
  return {key,sampleSize:r.length,successRate:r.length?Number((wins/r.length).toFixed(3)):null,
    recentSuccessRate:recent.length?Number((recent.filter(o=>o.outcome==='SUCCESS').length/recent.length).toFixed(3)):null,
    avgRealizedRoiPct:rois.length?Number((rois.reduce((a,b)=>a+b,0)/rois.length).toFixed(2)):null};
}
function group(o:DecisionOutcome[], field:'category'|'sourceId'|'decision'):PolicyMemorySlice[] {
  const keys=[...new Set(o.map(x=>x[field]).filter((v):v is string=>typeof v==='string'&&v.length>0))];
  return keys.map(k=>makeSlice(k,o.filter(x=>x[field]===k))).sort((a,b)=>b.sampleSize-a.sampleSize);
}

export function buildPolicyMemory(outcomes:DecisionOutcome[]=[]):PolicyMemory {
  const r=resolved(outcomes), byCategory=group(outcomes,'category'), bySource=group(outcomes,'sourceId'), byDecision=group(outcomes,'decision');
  const transferSamples=byCategory.concat(bySource).filter(s=>s.sampleSize>=3).length;
  const transferConfidence=clamp(Math.round(Math.min(1,transferSamples/6)*70+Math.min(1,r.length/30)*30));
  const rationale:string[]=[];
  if(!r.length) rationale.push('Brak rozstrzygniętych outcomeów — pamięć między-dealowa jest pusta.');
  else rationale.push(`Pamięć agreguje ${r.length} outcomeów oraz ${byCategory.length} kategorii i ${bySource.length} źródeł.`);
  if(transferSamples) rationale.push(`Transfer wiedzy aktywny dla ${transferSamples} kohort z co najmniej 3 obserwacjami.`);
  return {version:'m9.9-cross-deal-memory-v1',global:makeSlice('GLOBAL',outcomes),byCategory,bySource,byDecision,transferConfidence,rationale};
}

export function buildAdaptivePolicy(outcomes:DecisionOutcome[]=[]):AdaptivePolicy {
  const r=resolved(outcomes), wins=r.filter(o=>o.outcome==='SUCCESS').length, successRate=r.length?wins/r.length:null;
  const recent=r.slice(-10), recentSuccessRate=recent.length?recent.filter(o=>o.outcome==='SUCCESS').length/recent.length:null;
  const memory=buildPolicyMemory(outcomes);
  let actionThreshold=82,evidenceThreshold=70,roiThreshold=15,riskCeiling:'low'|'medium'|'high'='high',confidenceThreshold=70,explorationRate=.15;
  const rationale:string[]=[];
  const calibration:AdaptivePolicy['calibration']=r.length===0?'NO_DATA':r.length<10?'EARLY':r.length<30?'LEARNING':'STABLE';
  if(r.length<5){rationale.push('Brak wystarczającej historii outcomeów — polityka pozostaje ostrożna.');actionThreshold=85;evidenceThreshold=75;confidenceThreshold=75;explorationRate=.2;}
  else if((recentSuccessRate??0)<.4){rationale.push('Recent success rate spadł poniżej 40% — zwiększono rygor decyzji.');actionThreshold=90;evidenceThreshold=82;roiThreshold=20;riskCeiling='medium';confidenceThreshold=82;explorationRate=.05;}
  else if((successRate??0)>=.7&&r.length>=15){rationale.push('Historia outcomeów wspiera łagodniejsze progi dla dobrze udokumentowanych okazji.');actionThreshold=78;evidenceThreshold=65;roiThreshold=12;confidenceThreshold=65;explorationRate=.18;}
  else rationale.push('Historia jest użyteczna, ale niewystarczająca do agresywnej adaptacji.');
  const reliable=[memory.byCategory.find(s=>s.sampleSize>=5),memory.bySource.find(s=>s.sampleSize>=5)].filter((s):s is PolicyMemorySlice=>!!s);
  if(reliable.some(s=>(s.successRate??0)>=.8)&&memory.transferConfidence>=40){actionThreshold=Math.max(75,actionThreshold-2);rationale.push('Cross-deal memory wykryła stabilnie dodatnią kohortę — próg akcji skorygowano o 2 pkt.');}
  else if(reliable.some(s=>(s.successRate??1)<.4)&&memory.transferConfidence>=40){actionThreshold=Math.min(92,actionThreshold+3);explorationRate=Math.min(explorationRate,.08);rationale.push('Cross-deal memory wykryła słabą kohortę — zwiększono ostrożność.');}
  return {version:'m9.8-policy-learning-v1',actionThreshold,evidenceThreshold,roiThreshold,riskCeiling,confidenceThreshold,explorationRate,
    sampleSize:r.length,successRate:successRate===null?null:Number(successRate.toFixed(3)),recentSuccessRate:recentSuccessRate===null?null:Number(recentSuccessRate.toFixed(3)),
    calibration,rationale,memory};
}

export function evaluateDecisionOutcome(input:{deal:DealAnalysis;decision:'BUY'|'WATCH'|'PASS';realizedRoiPct?:number|null;reason?:string}):DecisionOutcome {
  const roi=input.realizedRoiPct??null;
  const outcome=roi===null?'UNRESOLVED':input.decision==='PASS'?(roi<=0?'SUCCESS':'FAILURE'):input.decision==='BUY'?(roi>=0?'SUCCESS':'FAILURE'):(roi>=input.deal.roiPct?'SUCCESS':'FAILURE');
  return {id:crypto.randomUUID(),dealId:input.deal.id,decision:input.decision,outcome,realizedRoiPct:roi,observedAt:new Date().toISOString(),
    reason:input.reason??'Outcome recorded from subsequent market observation.',category:input.deal.category,sourceId:input.deal.sourceId,risk:input.deal.risk,expectedRoiPct:input.deal.roiPct};
}

export function policyAccepts(deal:DealAnalysis,policy:AdaptivePolicy):boolean {
  const riskRank={low:0,medium:1,high:2,critical:3} as const;
  if(deal.risk==='critical'||riskRank[deal.risk]>riskRank[policy.riskCeiling])return false;
  if(deal.score<policy.actionThreshold)return false;
  if(deal.confidence<policy.confidenceThreshold)return false;
  if(deal.confidence<policy.evidenceThreshold)return false;
  if(deal.roiPct<policy.roiThreshold)return false;
  return true;
}