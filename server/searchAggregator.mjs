const normalizeText = value => String(value ?? '')
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

const productKey = deal => {
  if (deal.ean) return 'ean:' + normalizeText(deal.ean);
  const title = normalizeText(deal.title);
  const tokens = title.split(' ').filter(Boolean).filter(x => !['nowy','nowa','nowe','black','white','czarny','czarna','bialy','biały','promocja','oryginalny','oryginalna'].includes(x));
  return 'title:' + tokens.slice(0, 8).join(' ');
};

const median = values => {
  const a = values.filter(Number.isFinite).sort((x,y) => x-y);
  if (!a.length) return null;
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m-1] + a[m]) / 2;
};

function enrichCrossMarket(results) {
  const groups = new Map();
  for (const deal of results) {
    const key = productKey(deal);
    const list = groups.get(key) ?? [];
    list.push(deal);
    groups.set(key, list);
  }
  return results.map(deal => {
    const peers = groups.get(productKey(deal)) ?? [deal];
    const prices = peers.map(x => Number(x.price)).filter(x => x > 0);
    const benchmark = median(prices);
    return {
      ...deal,
      marketMedian: benchmark ?? deal.marketMedian ?? undefined,
      estimatedResalePrice: deal.estimatedResalePrice ?? benchmark ?? undefined,
      marketSampleSize: prices.length,
      marketSources: [...new Set(peers.map(x => x.sourceId).filter(Boolean))],
      marketHigherCount: prices.filter(p => p >= Number(deal.price) * 1.02).length,
      marketLowerCount: prices.filter(p => p <= Number(deal.price) * 0.98).length,
    };
  });
}

/**
 * Provider-agnostic fan-out. Provider failures are isolated and retained
 * as provenance; successful offers continue through the intelligence core.
 */
export async function searchAllProviders({ query, limit, onlyProviderId, providers, getAdapter, redact, context = {} }) {
  const candidates = providers.filter(provider => {
    if (onlyProviderId && provider.id !== onlyProviderId) return false;
    if (!provider.enabled(provider)) return false;
    if (!getAdapter(provider.id)) return false;
    return provider.credentialsPresent(provider);
  });

  const settled = await Promise.all(candidates.map(async provider => {
    try {
      const deals = await getAdapter(provider.id).search(query, limit, redact, context);
      const list = Array.isArray(deals) ? deals : [];
      return { id: provider.id, status: 'ok', resultCount: list.length, deals: list, error: null };
    } catch (error) {
      return {
        id: provider.id,
        status: 'error',
        resultCount: 0,
        deals: [],
        error: redact(error instanceof Error ? error.message : 'Provider search failed'),
      };
    }
  }));

  const rawResults = settled.flatMap(entry => entry.deals);
  const results = enrichCrossMarket(rawResults);

  return {
    results,
    providers: settled.map(({ id, status, resultCount, error }) => ({ id, status, resultCount, error })),
    unavailable: providers
      .filter(provider => (!onlyProviderId || provider.id === onlyProviderId) && !provider.enabled(provider))
      .map(provider => ({ id: provider.id, reason: 'disabled' })),
  };
}
