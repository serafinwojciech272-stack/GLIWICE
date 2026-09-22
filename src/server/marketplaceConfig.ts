import type { MarketplaceHealth } from './marketplaceTypes';
const env=(key:string)=>Boolean((process.env[key]??'').trim());
export function marketplaceHealth(): MarketplaceHealth[]{
 return [
  {id:'allegro',name:'Allegro',mode:'account',status:env('ALLEGRO_CLIENT_ID') && env('ALLEGRO_CLIENT_SECRET')?'configured':'missing-credentials',configured:env('ALLEGRO_CLIENT_ID') && env('ALLEGRO_CLIENT_SECRET'),message:'Official OAuth/API connector; public marketplace search is not assumed.'},
  {id:'ebay',name:'eBay',mode:'live-search',status:env('EBAY_CLIENT_ID') && env('EBAY_CLIENT_SECRET')?'configured':'missing-credentials',configured:env('EBAY_CLIENT_ID') && env('EBAY_CLIENT_SECRET'),message:'Official Browse API connector.'},
  {id:'amazon',name:'Amazon',mode:'account',status:env('AMAZON_LWA_CLIENT_ID') && env('AMAZON_LWA_CLIENT_SECRET')?'configured':'missing-credentials',configured:env('AMAZON_LWA_CLIENT_ID') && env('AMAZON_LWA_CLIENT_SECRET'),message:'SP-API connector; access depends on Amazon authorization/program.'},
  {id:'olx',name:'OLX',mode:'account',status:env('OLX_CLIENT_ID') && env('OLX_CLIENT_SECRET')?'configured':'missing-credentials',configured:env('OLX_CLIENT_ID') && env('OLX_CLIENT_SECRET'),message:'Partner API connector.'},
  {id:'temu',name:'Temu',mode:'account',status:env('TEMU_APP_KEY') && env('TEMU_APP_SECRET')?'configured':'missing-credentials',configured:env('TEMU_APP_KEY') && env('TEMU_APP_SECRET'),message:'Partner/Open API connector.'},
  {id:'ceneo',name:'Ceneo',mode:'benchmark',status:env('CENEO_API_KEY')?'configured':'missing-credentials',configured:env('CENEO_API_KEY'),message:'Price benchmark connector.'},
  {id:'erli',name:'ERLI',mode:'account',status:env('ERLI_API_KEY')?'configured':'missing-credentials',configured:env('ERLI_API_KEY'),message:'Marketplace API connector.'},
  {id:'empik',name:'Empik',mode:'account',status:env('EMPIK_API_KEY')?'configured':'missing-credentials',configured:env('EMPIK_API_KEY'),message:'Seller API connector.'},
  {id:'kaufland',name:'Kaufland',mode:'account',status:env('KAUFLAND_CLIENT_KEY') && env('KAUFLAND_SECRET_KEY')?'configured':'missing-credentials',configured:env('KAUFLAND_CLIENT_KEY') && env('KAUFLAND_SECRET_KEY'),message:'Seller API connector.'}
 ];
}