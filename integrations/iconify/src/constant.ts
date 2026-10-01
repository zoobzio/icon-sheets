/**
 * The public Iconify API — the fallback when a collection is not installed
 * locally. A batched request per prefix returns a trimmed IconifyJSON whose
 * alias dependencies are already resolved, so `getIconData` works on it
 * directly.
 */
export const API_BASE = "https://api.iconify.design";
