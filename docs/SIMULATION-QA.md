# Extra Szpieg Simulation QA

## Cel

Synthetic Market Lab generates 250 deterministic offers so the scoring pipeline can be tested before any real commerce source is connected.

The fixture deliberately contains:

- genuine low-price opportunities;
- normal market offers;
- misleading crossed-out prices;
- variant traps;
- refurbished/outlet offers;
- out-of-stock offers;
- stale observations;
- different sellers and shipping costs.

## Truth boundary

Simulation data is not internet data. It must never be presented as a real retailer price, real seller, or live market observation.

## Evaluation

`evaluateSimulation()` measures:

- precision of BUY/STRONG BUY signals;
- recall of planted opportunities;
- false positives;
- trap BUY signals;
- average evidence confidence;
- precision of the top 10 ranked signals.

The objective is not to maximize the number of BUY signals. The objective is to surface a small set of high-quality opportunities and reject weak evidence.

## Next QA layer

The next validation layer should add recorded real observations, product-level price histories, source freshness and resale-market observations. Real-source adapters should be connected only after their legal/public access path, rate limits and data provenance are defined.
