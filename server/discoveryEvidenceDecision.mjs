function clamp(value){return Math.max(0,Math.min(100,Math.round(Number(value)||0)));}

export function buildEvidencePackage(deal){
  const evidence=[];
  const add=(kind,label,value,sourceId,confidence)=>evidence.push({kind,label,value:String(value),sourceId:sourceId||undefined,confidence});
  if(deal.sourceId||deal.store) add('observed','Source',deal.store||deal.sourceId,deal.sourceId,100);
  if(Number.isFinite(Number(deal.price))) add('observed','Observed price',Number(deal.price).toFixed(2)+' PLN',deal.sourceId,100);
  if(deal.sourceUrl) add('observed','Listing URL',deal.sourceUrl,deal.sourceId,100);
  if(deal.ean) add('observed','EAN/GTIN',deal.ean,deal.sourceId,100);
  if(deal.marketMedian) add('calculated','Cross-market median',Number(deal.marketMedian).toFixed(2)+' PLN',deal.sourceId,85);
  if(deal.discoveryDiscountPct!==undefined) add('calculated','Discovery discount',Number(deal.discoveryDiscountPct).toFixed(1)+'%',deal.sourceId,85);
  if(deal.marketSampleSize) add('calculated','Market sample size',deal.marketSampleSize,'',80);
  if(deal.marketSources?.length) add('observed','Market sources',deal.marketSources.join(', '),'',80);
  const observed=evidence.filter(x=>x.kind==='observed').length;
  const calculated=evidence.filter(x=>x.kind==='calculated').length;
  const missing=[];
  if(!deal.title) missing.push('title');
  if(!deal.sourceUrl) missing.push('sourceUrl');
  if(!Number.isFinite(Number(deal.price))||Number(deal.price)<=0) missing.push('price');
  const confidence=clamp((observed*20)+(calculated*12)-missing.length*25);
  return {version:'m11.2-evidence-package-v1',status:missing.length?'INCOMPLETE':'READY',confidence,observedCount:observed,calculatedCount:calculated,missing,items:evidence};
}

export function buildDiscoveryDecision(deal,evidence){
  const score=clamp(deal.discoveryScore);
  const discount=Number(deal.discoveryDiscountPct)||0;
  const sample=Number(deal.marketSampleSize)||0;
  const quality=Number(deal.discoveryQualityScore)||0;
  const evidenceReady=evidence.status==='READY'&&evidence.confidence>=60;
  const decision= !evidenceReady || quality<60 || score<35 ? 'PASS' : score>=75&&discount>=15&&sample>=2 ? 'BUY' : score>=45 ? 'WATCH' : 'PASS';
  const reasons=[
    'discovery score '+score+'/100',
    'discovery quality '+quality+'/100',
    'evidence '+evidence.status+' '+evidence.confidence+'/100',
    'cross-market sample '+sample,
    'discount '+discount.toFixed(1)+'%',
  ];
  return {version:'m11.2-discovery-decision-bridge-v1',decision,decisionReady:evidenceReady&&quality>=60,score,confidence:Math.min(evidence.confidence,quality),reasons};
}

export function evaluateDiscoveryCandidate(deal){
  const evidence=buildEvidencePackage(deal);
  const decision=buildDiscoveryDecision(deal,evidence);
  return {...deal,evidencePackage:evidence,decision};
}
