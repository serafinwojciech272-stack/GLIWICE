export type AllegroEnvironment = 'sandbox' | 'production';

type TokenResponse = { access_token: string; token_type: string; expires_in: number; refresh_token?: string; scope?: string };
type GatewayConfig = { environment: AllegroEnvironment; clientId: string; clientSecret: string; redirectUri: string; fetchImpl?: typeof fetch };

const endpoints = {
  sandbox: { api: 'https://api.allegro.pl.allegrosandbox.pl', auth: 'https://allegro.pl.allegrosandbox.pl/auth/oauth' },
  production: { api: 'https://api.allegro.pl', auth: 'https://allegro.pl/auth/oauth' },
} as const;

const jsonHeaders = { Accept: 'application/vnd.allegro.public.v1+json' };

export function createAllegroGateway(config: GatewayConfig) {
  const fetchImpl = config.fetchImpl ?? fetch;
  const endpoint = endpoints[config.environment];

  const basicAuth = () => 'Basic ' + btoa(config.clientId + ':' + config.clientSecret);

  return {
    authorizationUrl(state: string, scope = 'allegro_api') {
      const url = new URL(endpoint.auth + '/authorize');
      url.searchParams.set('response_type', 'code');
      url.searchParams.set('client_id', config.clientId);
      url.searchParams.set('redirect_uri', config.redirectUri);
      url.searchParams.set('state', state);
      url.searchParams.set('scope', scope);
      return url.toString();
    },

    async exchangeCode(code: string): Promise<TokenResponse> {
      const body = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: config.redirectUri,
      });
      const response = await fetchImpl(endpoint.auth + '/token', {
        method: 'POST',
        headers: { Authorization: basicAuth(), 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });
      if (!response.ok) throw new Error('Allegro OAuth token exchange failed: HTTP ' + response.status);
      return response.json() as Promise<TokenResponse>;
    },

    async refreshToken(refreshToken: string): Promise<TokenResponse> {
      const body = new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken });
      const response = await fetchImpl(endpoint.auth + '/token', {
        method: 'POST',
        headers: { Authorization: basicAuth(), 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });
      if (!response.ok) throw new Error('Allegro OAuth refresh failed: HTTP ' + response.status);
      return response.json() as Promise<TokenResponse>;
    },

    async searchOffers(accessToken: string, phrase: string, limit = 100) {
      const url = new URL(endpoint.api + '/offers/listing');
      url.searchParams.set('phrase', phrase);
      url.searchParams.set('limit', String(Math.min(100, Math.max(1, limit))));
      const response = await fetchImpl(url, {
        headers: { ...jsonHeaders, Authorization: 'Bearer ' + accessToken, 'Accept-Language': 'pl-PL' },
      });
      if (!response.ok) throw new Error('Allegro offer search failed: HTTP ' + response.status);
      return response.json();
    },
  };
}

export { endpoints as ALLEGRO_ENDPOINTS };
