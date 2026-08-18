import { describe, it, expect, vi } from "vitest";

const service = { marker: "icon-sheets" };
const nuxtApp = { $iconSheets: service };

vi.mock("#app", () => ({
  useNuxtApp: () => nuxtApp,
}));

import { useIconSheets } from "../../src/runtime/composable";

describe("useIconSheets", () => {
  it("returns the $iconSheets service from the nuxt app", () => {
    expect(useIconSheets()).toBe(service);
  });
});
