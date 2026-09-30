import { buildEvidencePackage, buildDiscoveryDecision, evaluateDiscoveryCandidate } from '../server/discoveryEvidenceDecision.mjs';
const now=new Date().toISOString();
const deal={title:'Sony WH-1000XM5',ean:'5901234567890',price:600,marketMedian:850,discoveryDiscountPct:29.4,marketSampleSize:2,marketSources:['amazon','olx'],discoveryScore:82,discoveryQualityScore:100,sourceId:'amazon',sourceUrl:'https://example.com/a',observedAt:now};
const e=buildEvidencePackage(deal); if(e.status!=='READY'||e.observedCount<3||e.calculatedCount<2)throw new Error('evidence package incomplete');
const d=buildDiscoveryDecision(deal,e); if(d.decision!=='BUY'||!d.decisionReady)throw new Error('decision bridge failed');
const bad=evaluateDiscoveryCandidate({...deal,discoveryQualityScore:40}); if(bad.decision.decision!=='PASS'||bad.decision.decisionReady)throw new Error('quality gate bypassed decision');
console.log('M11.2 EVIDENCE DECISION SMOKE PASS');
