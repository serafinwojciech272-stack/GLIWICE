export function getAllegroConfig(env: Record<string, string | undefined> = import.meta.env as Record<string, string | undefined>) {
  return {
    environment: env.ALLEGRO_ENVIRONMENT === 'production' ? 'production' as const : 'sandbox' as const,
    clientId: env.ALLEGRO_CLIENT_ID ?? '',
    clientSecret: env.ALLEGRO_CLIENT_SECRET ?? '',
    redirectUri: env.ALLEGRO_REDIRECT_URI ?? '',
  };
}
