import * as ebay from './ebay.mjs';
import * as allegro from './allegro.mjs';
import { createPublicAdapter } from './publicMarketplace.mjs';

const publicAdapters = {
  olx: createPublicAdapter({id:'olx',name:'OLX',buildUrl:q=>'https://www.olx.pl/oferty/q-'+encodeURIComponent(q)+'/'}),
  ceneo: createPublicAdapter({id:'ceneo',name:'Ceneo',buildUrl:q=>'https://www.ceneo.pl/;szukaj-'+encodeURIComponent(q)}),
  amazon: createPublicAdapter({id:'amazon',name:'Amazon',buildUrl:q=>'https://www.amazon.pl/s?k='+encodeURIComponent(q)}),
  empik: createPublicAdapter({id:'empik',name:'Empik',buildUrl:q=>'https://www.empik.com/szukaj/produkt?q='+encodeURIComponent(q)}),
  temu: createPublicAdapter({id:'temu',name:'Temu',buildUrl:q=>'https://www.temu.com/search_result.html?search_key='+encodeURIComponent(q)}),
  erli: createPublicAdapter({id:'erli',name:'ERLI',buildUrl:q=>'https://erli.pl/szukaj?q='+encodeURIComponent(q)}),
  kaufland: createPublicAdapter({id:'kaufland',name:'Kaufland',buildUrl:q=>'https://www.kaufland.pl/szukaj.html?search_value='+encodeURIComponent(q)}),
};
const ADAPTERS = { ebay, allegro, ...publicAdapters };
export function getAdapter(id){ return ADAPTERS[id] ?? null; }
