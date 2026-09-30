import { evaluateDiscoveryCandidate } from './discoveryEvidenceDecision.mjs';
import { applyDiscoveryQualityGate } from './discoveryQuality.mjs';
import { applyMissionGate } from './discoveryMissionGate.mjs';
const DISCOVERY_PROFILES = [
  { id: 'electronics', query: 'elektronika okazja' },
  { id: 'computers', query: 'laptop komputer okazja' },
  { id: 'phones', query: 'smartfon telefon okazja' },
  { id: 'audio', query: 'słuchawki audio okazja' },
  { id: 'drones', query: 'dron okazja' },
  { id: 'books', query: 'książki okazja' },
  { id: 'records', query: 'płyty winyl CD okazja' },
  { id: 'furniture', query: 'meble okazja' },
  { id: 'gaming', query: 'gaming konsola okazja' },
  { id: 'cameras', query: 'aparat fotograficzny okazja' },
  { id: 'home', query: 'AGD dom ogród okazja' },
  { id: 'collectibles', query: 'kolekcjonerskie okazja' }
];
const normalize = value => String(value ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const median = values => { const a=values.filter(Number.isFinite).sort((x,y)=>x-y); if(!a.length)return null; const m=Math.floor(a.length/2); return a.length%2?a[m]:(a[m-1]+a[m])/2; };
const keyOf = deal => deal.ean ? `ean:${normalize(deal.ean)}` : `title:${normalize(deal.title).split(' ').filter(Boolean).slice(0,8).join(' ')}`;
function opportunityScore(deal){const price=Number(deal.price)||0;const market=Number(deal.marketMedian)||0;const discount=market>0?Math.max(0,((market-price)/market)*100):0;const depth=Math.min(100,(Number(deal.marketSampleSize)||0)*20);const identity=deal.ean?20:deal.sku?12:0;const fresh=deal.observedAt&&Date.now()-Date.parse(deal.observedAt)<86400000?10:0;return Math.round(Math.min(100,discount*1.4+depth*.25+identity+fresh));}
export function getDiscoveryProfiles(){return DISCOVERY_PROFILES.map(x=>({...x}));}
export async function runMassDiscovery({search,profiles=DISCOVERY_PROFILES,perQuery=12,maxResults=50}){
 const runs=await Promise.all(profiles.map(async profile=>{try{const response=await search(profile.query,perQuery,null,{discoveryProfile:profile.id,massDiscovery:true});return{profile:profile.id,query:profile.query,results:response.results??[],providers:response.providers??[]};}catch(error){return{profile:profile.id,query:profile.query,results:[],providers:[],error:String(error?.message||error)}}}));
 const all=runs.flatMap(run=>run.results.map(deal=>({...deal,discoveryProfile:run.profile})));
 const groups=new Map(); for(const deal of all){const key=keyOf(deal);const list=groups.get(key)??[];list.push(deal);groups.set(key,list);}
 const enriched=all.map(deal=>{const peers=groups.get(keyOf(deal))??[deal];const prices=peers.map(x=>Number(x.price)).filter(x=>x>0);const marketMedian=median(prices);const discount=marketMedian&&Number(deal.price)>0?Math.max(0,((marketMedian-Number(deal.price))/marketMedian)*100):0;return{...deal,marketMedian:marketMedian??deal.marketMedian,marketSampleSize:prices.length,marketSources:[...new Set(peers.map(x=>x.sourceId).filter(Boolean))],discoveryDiscountPct:Number(discount.toFixed(1)),discoveryScore:opportunityScore({...deal,marketMedian:marketMedian??deal.marketMedian})};});
 const quality=applyDiscoveryQualityGate(enriched); const unique=new Map(); for(const deal of quality.accepted){const k=`${keyOf(deal)}|${deal.sourceId}|${deal.sourceUrl}`;if(!unique.has(k)||deal.discoveryScore>unique.get(k).discoveryScore)unique.set(k,deal);}
 const ranked=applyMissionGate([...unique.values()].map(evaluateDiscoveryCandidate)).sort((a,b)=>(b.decision.score-a.decision.score)||(b.discoveryScore-a.discoveryScore)).slice(0,maxResults);
 const decisionStats=ranked.reduce((acc,d)=>{const key=d?.decision?.decision||'UNKNOWN';acc[key]=(acc[key]||0)+1;return acc;},{BUY:0,WATCH:0,PASS:0,UNKNOWN:0}); const missionStats=ranked.reduce((acc,d)=>{acc.total++;if(d?.missionIntent?.eligible)acc.eligible++;if(d?.missionIntent?.state==='AWAITING_APPROVAL')acc.awaitingApproval++;return acc;},{total:0,eligible:0,awaitingApproval:0}); return{mode:'M11_MASS_DISCOVERY',pipeline:'M11.3_EVIDENCE_DECISION_MISSION_GATE',generatedAt:new Date().toISOString(),profiles:profiles.map(x=>x.id),profileCount:profiles.length,scannedOffers:all.length,qualityAccepted:quality.accepted.length,qualityRejected:quality.rejected.length,uniqueOffers:unique.size,decisionStats,missionStats,results:ranked,runs:runs.map(x=>({profile:x.profile,query:x.query,resultCount:x.results.length,providers:x.providers,error:x.error||null}))};
}
