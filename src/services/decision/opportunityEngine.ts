import type { DealAnalysis } from '../../domain/deal';
import { policyAccepts, buildAdaptivePolicy, arbitratePolicyContext, type AdaptivePolicy } from '../learning/decisionPolicyLearning';

export type OpportunityDecision = { buyScore:number; marketabilityScore:number; evidenceScore:number; riskAdjustedScore:number; decision:'BUY'|'WATCH'|'PASS'; reasons:string[] };
function clamp(value:number){return Math.max(0,Math.min(100,Math.round(value)))}
export function decideOpportunity(deal:DealAnalysis, policy:AdaptivePolicy=buildAdaptivePolicy()):OpportunityDecision{
 const context=arbitratePolicyContext({deal,outcomes:[] ,memory:policy.memory});
 const effectiveActionThreshold=Math.max(50,Math.min(95,policy.actionThreshold+context.actionDelta));
 const effectiveRisk= context.riskDelta>0 ? (policy.riskCeiling==='high'?'medium':'low') : policy.riskCeiling;
 const availability=deal.availability==='in_stock'?100:deal.availability==='limited'?72:deal.availability==='unknown'?35:0;
 const seller=deal.sellerRating?Math.min(100,deal.sellerRating/5*100):45;
 const resaleEvidence=deal.estimatedResalePrice?80:deal.marketMedian?60:30;
 const marketabilityScore=clamp(availability*.4+seller*.25+resaleEvidence*.35),evidenceScore=deal.confidence,riskAdjustedScore=clamp(deal.score*(1-deal.riskScore/130)),buyScore=clamp(riskAdjustedScore*.5+marketabilityScore*.2+evidenceScore*.3);
 const rawDecision=deal.risk==='critical'||deal.availability==='out_of_stock'||buyScore<58?'PASS':buyScore>=82&&deal.roiPct>=15&&evidenceScore>=70?'BUY':'WATCH';
 const accepted=deal.score>=effectiveActionThreshold&&deal.risk!=='critical'&&({low:0,medium:1,high:2,critical:3} as const)[deal.risk]<=({low:0,medium:1,high:2} as const)[effectiveRisk]&&deal.confidence>=policy.confidenceThreshold&&deal.confidence>=policy.evidenceThreshold&&deal.roiPct>=policy.roiThreshold;
 const decision=rawDecision==='BUY'&&!accepted?'WATCH':rawDecision;
 const reasons=[`policy ${policy.version} ${accepted?'accepted':'restricted'}`,`context ${context.score}/100 confidence ${context.confidence}/100`,`action threshold ${effectiveActionThreshold}/100`,`marketability ${marketabilityScore}/100`,`evidence ${evidenceScore}/100`,`risk-adjusted ${riskAdjustedScore}/100`,deal.availability==='in_stock'?'produkt dostępny':`dostępność: ${deal.availability}`];
 return{buyScore,marketabilityScore,evidenceScore,riskAdjustedScore,decision,reasons};
}
