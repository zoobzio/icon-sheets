/**
 * The remote catalog config the module writes into `runtimeConfig.iconSheets`: the
 * origin the routes proxy to, static headers, and the bearer token (server-only,
 * filled from the shared env var at runtime).
 */
export interface RemoteConfig {
  base?: string;
  headers?: Record<string, string>;
  token?: string;
}

/**
 * The headers a proxied catalog request carries: the configured static headers
 * plus the bearer token when present. The token stays on the server — the browser
 * only ever talks to the app's own origin.
 */
export const remoteHeaders = (cfg: RemoteConfig): Record<string, string> => ({
  accept: "application/json",
  ...cfg.headers,
  ...(cfg.token ? { authorization: `Bearer ${cfg.token}` } : {}),
});
