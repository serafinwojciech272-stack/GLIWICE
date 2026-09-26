export type AllegroEnvironment = 'sandbox' | 'production';

export const ALLEGRO_ENDPOINTS: {
  sandbox: { api: string; auth: string };
  production: { api: string; auth: string };
};

export function allegroEnvironment(value: string | undefined): AllegroEnvironment;
export function endpointsFor(environment: string | undefined): { api: string; auth: string };
export function clampLimit(value: unknown, fallback?: number): number;
export function offersListingUrl(environment: string | undefined, phrase: string, limit?: unknown): URL;
export function offerSearchHeaders(accessToken: string): Record<string, string>;
export function fetchOffersListing(options: {
  environment: string | undefined;
  accessToken: string;
  phrase: string;
  limit?: unknown;
  fetchImpl?: typeof fetch;
}): Promise<Response>;
