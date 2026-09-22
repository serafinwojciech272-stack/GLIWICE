import fs from 'node:fs';
const required=['src/server/marketplaceTypes.ts','src/server/marketplaceConfig.ts','src/server/marketplaceSearch.ts','server/index.mjs'];
for(const f of required){if(!fs.existsSync(f))throw new Error('Missing '+f)}
const text=fs.readFileSync('src/server/marketplaceConfig.ts','utf8');
for(const key of ['ALLEGRO_CLIENT_ID','EBAY_CLIENT_ID','AMAZON_LWA_CLIENT_ID','OLX_CLIENT_ID','TEMU_APP_KEY','CENEO_API_KEY','ERLI_API_KEY','EMPIK_API_KEY','KAUFLAND_CLIENT_KEY']) if(!text.includes(key)) throw new Error('Missing env mapping '+key);
const api=fs.readFileSync('server/index.mjs','utf8'); for(const route of ['/health','/api/marketplaces/health','/api/marketplaces/search']) if(!api.includes(route)) throw new Error('Missing route '+route);
console.log('MARKETPLACE CONFIG SMOKE: PASS');