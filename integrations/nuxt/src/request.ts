import type { GenerateOptions } from "@icon-sheets/kit";
import type { NuxtIconSheetsConfig } from "./config";

import { TOKEN_ENV } from "./constant";

/**
 * Builds the loader a local build fetches through, carrying the remote
 * catalog's auth — the bearer token from the shared env var over the catalog's
 * static headers — so refs from a private source resolve. Undefined when there
 * is nothing to send, leaving the kit's plain default.
 *
 * @param options - The module's configuration.
 */
export const defineRequest = (
  options: NuxtIconSheetsConfig,
): GenerateOptions["req"] => {
  const token = process.env[TOKEN_ENV];
  const headers: Record<string, string> = { ...options.catalog?.headers };
  if (token) {
    headers.authorization = `Bearer ${token}`;
  }
  if (Object.keys(headers).length === 0) {
    return undefined;
  }

  return async (src) => {
    const response = await fetch(src, { headers });
    if (!response.ok) {
      throw new Error(
        `icon-sheets: fetching ${src.href} failed with ${response.status} ${response.statusText}`,
      );
    }
    return response.text();
  };
};
