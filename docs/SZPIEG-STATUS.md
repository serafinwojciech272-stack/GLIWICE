# EXTRA SZPIEG — BUILD STATUS

## Product mode
Private resale intelligence workstation for Wojciech. Primary objective: discover underpriced online products, calculate realistic all-in acquisition cost, estimate resale potential, rank risk-adjusted opportunities and monitor selected deals.

## Current phase
Phase 1.5 — Intelligence Core hardening.

Implemented:
- Deal domain model with optional EAN/SKU/attributes/source identity
- deterministic deal scoring and risk engine
- market and historical price advantage
- corrected percentage-fee break-even calculation
- transparent profit assumptions
- source adapter abstraction + centralized source registry
- source health gating
- mock source through the real scan pipeline
- scan engine
- local auditable AI analyst layer
- AI system prompt contract
- market snapshot domain
- price history statistics: median, min/max, volatility, trend
- discount authenticity check
- deterministic product matching: product ID, EAN/SKU-ready model, brand/model, title token similarity
- confidence score and human-review threshold for uncertain matches
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
The next technical milestone is Phase 2: legal real market data adapters + persistent price history.

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
1. Legal real source adapters with rate limits and explicit source metadata
2. Persistent price observations and scheduled refreshes
3. Strong product matching waterfall with EAN/GTIN/SKU/model/attributes and later visual similarity
4. Real resale-market observations and conservative liquidity estimates
5. Dedicated Supabase database for Extra Szpieg, never the GGA database
6. Server-side AI provider using the existing AI contract
7. Alerts and scheduled scans
8. Mass scanning / queue workers
9. Cross-source arbitrage graph and opportunity detection
10. Portfolio optimization with concentration/risk limits
