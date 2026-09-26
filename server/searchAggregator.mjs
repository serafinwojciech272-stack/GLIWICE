/**
 * Provider-agnostic search fan-out.
 *
 * Every enabled provider with a live adapter is queried independently. A provider that
 * throws contributes an error entry and never fails the aggregate request, so one broken
 * or unconfigured provider can never take down the gateway.
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

  return {
    results: settled.flatMap(entry => entry.deals),
    providers: settled.map(({ id, status, resultCount, error }) => ({ id, status, resultCount, error })),
    unavailable: providers
      .filter(provider => (!onlyProviderId || provider.id === onlyProviderId) && !provider.enabled(provider))
      .map(provider => ({ id: provider.id, reason: 'disabled' })),
  };
}
