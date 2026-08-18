import type { AppIconSheets } from "./types";

import { useNuxtApp } from "#app";

/**
 * Composable for the icon service: the active contract, the applied set, and the
 * user override layer. Every read and write flows through the reactive container
 * the plugin built, so a component that resolves an alias re-renders when the set
 * or an override changes.
 */
export const useIconSheets = (): AppIconSheets => {
  const { $iconSheets } = useNuxtApp();
  return $iconSheets;
};
