import type { AppIconSheets } from "./types";

import { makeIconSheets as makeService } from "icon-sheets";
import { accessIconSheets } from "./store";

/**
 * Builds the icon-sheets service over the reactive per-request container. State lives
 * in the container the store owns, so reads and writes are tracked and the sprite
 * re-renders when a set is applied or an override is written.
 */
export const makeIconSheets = (): AppIconSheets => {
  const { config } = accessIconSheets();
  return makeService(config.value);
};
