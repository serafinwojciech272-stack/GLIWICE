import { assessDiscoveryQuality, applyDiscoveryQualityGate } from '../server/discoveryQuality.mjs';
const now=new Date().toISOString();
const good={title:'Sony WH-1000XM5',ean:'5901234567890',price:600,marketMedian:850,discoveryDiscountPct:29.4,sourceId:'amazon',sourceUrl:'https://example.com/good',observedAt:now};
const bad={title:'',price:0,sourceId:'',sourceUrl:'',observedAt:'2000-01-01T00:00:00.000Z'};
const a=assessDiscoveryQuality(good); if(!a.accepted||a.qualityScore<90) throw new Error('valid discovery rejected');
const b=assessDiscoveryQuality(bad); if(b.accepted||!b.reasons.includes('invalid_price')||!b.reasons.includes('stale_observation')) throw new Error('invalid discovery accepted');
const gate=applyDiscoveryQualityGate([good,bad]); if(gate.accepted.length!==1||gate.rejected.length!==1) throw new Error('quality partition mismatch');
console.log('M11.1 DISCOVERY QUALITY SMOKE PASS');
