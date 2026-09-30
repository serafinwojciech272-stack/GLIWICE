import { spawn } from 'node:child_process';

const base=process.env.MARKETPLACE_GATEWAY_URL||'http://127.0.0.1:10000';
const startedBySmoke=!process.env.MARKETPLACE_GATEWAY_URL;
let child;

function assert(condition,message){if(!condition)throw new Error(message);}
async function get(path){
  const r=await fetch(base+path);
  const body=await r.json();
  return {status:r.status,body};
}

try{
  if(startedBySmoke){
    child=spawn(process.execPath,['server/index.mjs'],{env:{...process.env,PORT:'10000'},stdio:['ignore','pipe','pipe']});
    await new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>reject(new Error('Gateway did not start within 5s')),5000);
      child.stdout.on('data',chunk=>{if(String(chunk).includes('Extra Szpieg API listening')){clearTimeout(timer);resolve();}});
      child.on('error',reject);
      child.on('exit',code=>{if(code!==null&&code!==0)reject(new Error('Gateway exited with '+code));});
    });
  }

  const health=await get('/health');
  assert(health.status===200,'health HTTP '+health.status);
  assert(health.body?.ok===true,'health ok=false');

  const providers=await get('/api/marketplaces/health');
  assert(providers.status===200,'marketplace health HTTP '+providers.status);
  assert(Array.isArray(providers.body?.sources),'marketplace health sources missing');
  assert(providers.body.sources.length===9,'expected 9 marketplace providers');
  assert(providers.body.sources.every(x=>typeof x.enabled==='boolean'),'provider enabled flag missing');

  const search=await get('/api/marketplaces/search?q=iphone&limit=5');
  assert(search.status===200,'search HTTP '+search.status);
  assert(search.body?.query==='iphone','search query mismatch');
  assert(Array.isArray(search.body?.results),'search results missing');
  assert(Array.isArray(search.body?.sources),'search sources missing');
  assert(Array.isArray(search.body?.providers),'per-provider result array missing');

  const selected=await get('/api/marketplaces/search?q=iphone&limit=5&marketplace=ebay');
  assert(selected.status===200,'provider selection HTTP '+selected.status);
  assert(selected.body?.query==='iphone','provider selection query mismatch');
  assert(Array.isArray(selected.body?.results),'provider selection results missing');
  assert(selected.body?.selectedProvider==='ebay','selected provider mismatch');

  console.log('MARKETPLACE GATEWAY SMOKE: PASS');
  console.log(JSON.stringify({
    gateway:base,
    health:true,
    providers:providers.body.sources.map(x=>({id:x.id,configured:x.configured,status:x.status})),
    searchResults:search.body.results.length,
    selectedProviderResults:selected.body.results.length
  },null,2));
}finally{
  if(child){child.kill('SIGTERM');}
}
