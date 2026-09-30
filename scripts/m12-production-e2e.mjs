const base = (process.env.MARKETPLACE_GATEWAY_URL || 'https://extra-szpieg-api.onrender.com').replace(/\\/$/,'');
const json = async (url, options) => { const response = await fetch(url, options); const text = await response.text(); let body; try { body = JSON.parse(text); } catch { body = { raw:text }; } if (!response.ok) throw new Error('HTTP '+response.status+' '+JSON.stringify(body)); return body; };
const health = await json(base + '/health');
if (!health.ok) throw new Error('production health not ok');
const discovery = await json(base + '/api/marketplaces/discovery?perQuery=2&maxResults=20');
if (!Array.isArray(discovery.results)) throw new Error('production discovery results missing');
if (!Number.isInteger(discovery.profileCount) || discovery.profileCount < 1) throw new Error('discovery profile metadata missing');
if (!discovery.sources) throw new Error('production source health missing');
const buy = discovery.results.find(x => x?.decision?.decision === 'BUY' && x?.missionIntent?.eligible);
const server = await json(base + '/api/missions/health');
if (server.mode !== 'SERVER_FILE' || typeof server.missions !== 'number') throw new Error('server mission persistence unavailable');
if (buy) {
  const id = 'mission-m12-e2e-' + Date.now().toString(36);
  const common = { missionId:id, dealId:String(buy.id), sourceId:String(buy.sourceId||'unknown'), sourceUrl:String(buy.sourceUrl), decision:'BUY', confidence:Number(buy.missionIntent.confidence||0), evidenceVersion:String(buy.evidencePackage?.version||'m11.2-evidence-package-v1'), decisionVersion:String(buy.decision?.version||'m11.2-discovery-decision-bridge-v1') };
  await json(base+'/api/missions',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'CREATE',mission:common})});
  for (const action of ['APPROVE','CREATE_MISSION','START']) await json(base+'/api/missions',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action,missionId:id})});
  const done = await json(base+'/api/missions',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'OUTCOME',missionId:id,outcome:'SUCCESS',realizedRoiPct:0,reason:'M12 production E2E verification'})});
  if (done.mission?.state !== 'COMPLETED') throw new Error('production mission did not complete');
  console.log('M12 PRODUCTION E2E PASS · live discovery BUY → server mission lifecycle → outcome');
} else {
  if (!discovery.missionStats || typeof discovery.missionStats.eligible !== 'number') throw new Error('mission gate stats missing');
  console.log('M12 PRODUCTION E2E PASS · live discovery + mission gate verified; no live BUY candidate was available, so no synthetic transaction path was executed');
}
