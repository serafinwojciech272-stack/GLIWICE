# EXTRA SZPIEG — BUILD STATUS

## Product mode
Private resale intelligence workstation for Wojciech. Primary objective: discover underpriced online products, calculate realistic all-in acquisition cost, estimate resale potential, rank risk-adjusted opportunities and monitor selected deals.

## Current phase
Phase 1.6 — Intelligence Core + Simulation QA + Command Center skeleton.

Implemented:
- Deal domain model with EAN/SKU/attributes/source identity
- deterministic deal scoring and risk engine
- stale-data penalty and stale BUY guardrail
- market and historical price advantage
- corrected percentage-fee break-even calculation
- transparent profit assumptions
- source adapter abstraction + centralized source registry
- source health gating
- 250-offer deterministic Synthetic Market Lab
- scan engine
- simulation truth labels and evaluation metrics
- local auditable AI analyst layer
- AI system prompt contract
- market snapshot domain
- price history statistics: median, min/max, volatility, trend, 7d/30d/90d medians and freshness
- conservative discount authenticity check
- product matching waterfall with EAN/SKU/brand/model/title/attributes/condition guards
- confidence score and human-review threshold for uncertain matches
- opportunity decision engine with risk-adjusted score and marketability proxy
- portfolio allocation engine
- private command-center UI
- radar visualization
- ranked deal table
- minimum ROI control
- watchlist interaction
- deal analysis modal
- Profit Lab budget planner
- responsive mobile layout
- GitHub CI workflow for TypeScript + production build

## Current simulation truth boundary
The current scan is synthetic, not live internet data. The UI must never present Synthetic Market Lab observations as retailer prices or real sellers.
The simulation intentionally includes opportunities, normal offers, fake-discount traps, variant traps, refurbished/outlet items, out-of-stock offers and stale observations.

## Simulation QA objective
The model should prefer precision over volume. A successful run should surface a small number of high-quality opportunities, reject stale/out-of-stock/variant traps, and keep BUY decisions dependent on evidence, profitability and risk.

`src/services/simulation/evaluationEngine.ts` provides precision, recall, false-positive, trap-signal and top-10 precision metrics.

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
1. Run and inspect CI build result; fix any compile/runtime issues before preview checkpoint
2. Upgrade command-center UI with simulation QA panel, source health, price-history view and matching review queue
3. Add canonical product groups and cross-store offer deduplication
4. Add legal real source adapters with rate limits and explicit provenance
5. Persist price observations and scheduled refreshes
6. Add real resale-market observations and conservative liquidity estimates
7. Dedicated Supabase database for Extra Szpieg, never the GGA database
8. Server-side AI provider using the existing AI contract
9. Alerts and scheduled scans
10. Mass scanning / queue workers and cross-source arbitrage graph
