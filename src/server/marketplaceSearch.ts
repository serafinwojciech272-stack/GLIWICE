import type { MarketplaceSearchRequest, MarketplaceSearchResponse } from './marketplaceTypes';
import { marketplaceHealth } from './marketplaceConfig';
export async function searchMarketplaces(request: MarketplaceSearchRequest): Promise<MarketplaceSearchResponse>{
 const q=request.q.trim(); if(!q) throw new Error('Search query is required.');
 const limit=Math.min(50,Math.max(1,request.limit??20));
 const sources=marketplaceHealth();
 return {query:q,results:[],sources:sources.map(s=>({...s,message:s.configured?s.message+' Connector is configured; provider call is the next adapter stage.':s.message+' Credentials are not configured.'})),generatedAt:new Date().toISOString()};
}