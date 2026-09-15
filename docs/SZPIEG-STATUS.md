# EXTRA SZPIEG — BUILD STATUS

## Product mode
Private resale intelligence workstation for Wojciech. Primary objective: discover underpriced online products, calculate realistic all-in acquisition cost, estimate resale potential, rank risk-adjusted opportunities and monitor selected deals.

## Current phase
Phase 1 — MVP Core / Private Command Center.

Implemented:
- Deal domain model
- deterministic deal scoring
- market advantage calculation
- risk engine
- profit engine
- percentage marketplace/payment fees
- transparent default resale cost assumptions
- source adapter abstraction
- mock source through the real scan pipeline
- scan engine
- local auditable AI analyst layer
- AI system prompt contract
- market snapshot domain
- portfolio allocation engine
- private command-center UI
- radar visualization
- ranked deal table
- minimum ROI control
- watchlist interaction
- deal analysis modal
- Profit Lab budget planner
- responsive mobile layout

## Important truth boundary
Current market data is MOCK. The UI must never present mock observations as live internet prices.
The next technical milestone is Phase 2: legal real market data adapters + price history persistence.

## Cost model
Default model:
- marketplace fee: 8% of resale revenue
- payment fee: 1.5% of resale revenue
- packaging: 8 PLN
- inbound shipping: 0 PLN unless supplied
- other costs: 0 PLN

These are assumptions, not facts. The user must be able to override them before making a purchasing decision.

## AI boundary
AI interprets verified/calculated data. It must not invent prices, sellers, history, fees or guaranteed profits. Deterministic calculations remain authoritative.

## Deployment policy
Do NOT deploy to Vercel during normal build runs. Deploy only when the user explicitly asks for a deployment/checkpoint.

## Next long-run priorities
1. Real source adapter framework
2. Source health and freshness
3. Price history persistence
4. Product identity matching by EAN/SKU/title/attributes
5. Real resale market observations
6. Supabase database dedicated to Extra Szpieg, never the GGA database
7. Server-side AI provider using the existing AI contract
8. Alerts and scheduled scans
9. Mass scanning / queue workers
10. Advanced arbitrage and opportunity detection
