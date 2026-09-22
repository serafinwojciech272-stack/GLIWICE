export type AllegroEnvironment = 'sandbox' | 'production';

export const ALLEGRO_ENVIRONMENT: AllegroEnvironment =
  (typeof process !== 'undefined' && process.env.ALLEGRO_ENVIRONMENT === 'production') ? 'production' : 'sandbox';

export const ALLEGRO_SERVER_CONFIG = {
  environment: ALLEGRO_ENVIRONMENT,
  apiBase: ALLEGRO_ENVIRONMENT === 'production' ? 'https://api.allegro.pl' : 'https://api.allegro.pl.allegrosandbox.pl',
  authBase: ALLEGRO_ENVIRONMENT === 'production' ? 'https://allegro.pl/auth/oauth' : 'https://allegro.pl.allegrosandbox.pl/auth/oauth',
};
