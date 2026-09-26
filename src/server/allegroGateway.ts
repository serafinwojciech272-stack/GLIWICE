import {
  ALLEGRO_ENDPOINTS,
  endpointsFor,
  fetchOffersListing,
} from '../../server/allegroApi.mjs';
import type { AllegroEnvironment } from '../../server/allegroApi.mjs';

export type { AllegroEnvironment };

type TokenResponse = { access_token: string; token_type: string; expires_in: number; refresh_token?: string; scope?: string };
type GatewayConfig = { environment: AllegroEnvironment; clientId: string; clientSecret: string; redirectUri: string; fetchImpl?: typeof fetch };

export function createAllegroGateway(config: GatewayConfig) {
  const fetchImpl = config.fetchImpl ?? fetch;
  const endpoint = endpointsFor(config.environment);

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
      const response = await fetchOffersListing({ environment: config.environment, accessToken, phrase, limit, fetchImpl });
      if (!response.ok) throw new Error('Allegro offer search failed: HTTP ' + response.status);
      return response.json();
    },
  };
}

export { ALLEGRO_ENDPOINTS };
