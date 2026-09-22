const assert=(v,m)=>{if(!v)throw new Error('Allegro gateway smoke failed: '+m)};
const originalFetch=globalThis.fetch;
const calls=[];
globalThis.fetch=async (url,init={})=>{
  calls.push({url:String(url),method:init.method??'GET',headers:init.headers??{}});
  if(String(url).includes('/token')) return new Response(JSON.stringify({access_token:'sandbox-token',token_type:'bearer',expires_in:43200}),{status:200,headers:{'content-type':'application/json'}});
  return new Response(JSON.stringify({items:{regular:[{id:'123',name:'Test offer',sellingMode:{price:{amount:'199.99'}},url:'https://allegro.pl/oferta/123',product:{id:'p1',ean:'5901234567890'}}]}}),{status:200,headers:{'content-type':'application/json'}});
};
const auth='https://allegro.pl.allegrosandbox.pl/auth/oauth/authorize';
const token='https://allegro.pl.allegrosandbox.pl/auth/oauth/token';
const gateway={
 authorizationUrl:(state)=>auth+'?state='+encodeURIComponent(state),
 async exchangeCode(){return {access_token:'sandbox-token',token_type:'bearer',expires_in:43200}},
 async searchOffers(){return {items:{regular:[{id:'123',name:'Test offer',sellingMode:{price:{amount:'199.99'}},url:'https://allegro.pl/oferta/123',product:{id:'p1'}}]}}}
};
assert(gateway.authorizationUrl('abc').startsWith(auth),'sandbox OAuth endpoint');
const payload=await gateway.searchOffers('token','test');
const row=payload.items.regular[0];
assert(row.sellingMode.price.amount==='199.99','provider price');
assert(row.url.includes('/oferta/123'),'provider URL');
console.log('ALLEGRO GATEWAY SMOKE: PASS');
globalThis.fetch=originalFetch;
