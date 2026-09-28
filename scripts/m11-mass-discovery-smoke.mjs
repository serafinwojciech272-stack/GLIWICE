import { runMassDiscovery } from '../server/massDiscovery.mjs';
const calls=[];
const fixtures={
  'elektronika okazja':[{id:'m11-1',ean:'5901234567890',title:'Sony WH-1000XM5',price:600,sourceId:'amazon',sourceUrl:'https://example.com/a',observedAt:new Date().toISOString()},{id:'m11-2',ean:'5901234567890',title:'Sony WH-1000XM5',price:850,sourceId:'olx',sourceUrl:'https://example.com/b',observedAt:new Date().toISOString()}],
  'laptop komputer okazja':[{id:'m11-3',title:'Lenovo ThinkPad T14',price:1200,sourceId:'amazon',sourceUrl:'https://example.com/c',observedAt:new Date().toISOString()},{id:'m11-4',title:'Lenovo ThinkPad T14',price:1700,sourceId:'olx',sourceUrl:'https://example.com/d',observedAt:new Date().toISOString()}]
};
const search=async query=>{calls.push(query);return{results:fixtures[query]||[{id:'m11-generic',title:query,price:100,sourceId:'amazon',sourceUrl:`https://example.com/${encodeURIComponent(query)}`,observedAt:new Date().toISOString()}],providers:[{id:'amazon',status:'ok',resultCount:1}]}};
const result=await runMassDiscovery({search,perQuery:2,maxResults:20});
if(result.mode!=='M11_MASS_DISCOVERY')throw new Error('M11 mode missing');
if(result.profileCount<10)throw new Error('M11 profiles incomplete');
if(result.scannedOffers<result.profileCount)throw new Error('M11 did not scan every profile');
if(!result.uniqueOffers||!result.results.length)throw new Error('M11 produced no opportunities');
if(result.results[0].discoveryScore<1)throw new Error('M11 ranking did not score opportunities');
if(calls.length!==result.profileCount)throw new Error('M11 profile execution ledger mismatch');
console.log(`M11 profiles=${result.profileCount} scanned=${result.scannedOffers} unique=${result.uniqueOffers} ranked=${result.results.length}`);
console.log('M11 MASS DISCOVERY SMOKE PASS');
