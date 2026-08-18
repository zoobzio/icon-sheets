import { describe, it, expect, vi, beforeEach } from "vitest";
import { ref, type Ref } from "vue";
import { contract } from "../fixtures";

let states: Record<string, Ref<unknown>>;

vi.mock("#build/icon-sheets.mjs", () => ({ contract }));

vi.mock("#imports", () => ({
  useState: (key: string, init: () => unknown) => (states[key] ??= ref(init())),
}));

import { accessIconSheets } from "../../src/runtime/store";

describe("accessIconSheets", () => {
  beforeEach(() => {
    states = {};
  });

  it("seeds a detached contract clone with an empty override", () => {
    const store = accessIconSheets();

    expect(store.config.value.contract).toEqual(contract);
    expect(store.config.value.contract).not.toBe(contract);
    expect(store.config.value.contract.icons).not.toBe(contract.icons);
    expect(store.config.value.override).toEqual({});
  });

  it("keeps writes into the seeded state away from the build module", () => {
    const store = accessIconSheets();
    store.config.value.contract.icons.home.width = 999;

    expect(contract.icons.home.width).toBe(24);
  });
});
