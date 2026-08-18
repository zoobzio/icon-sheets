import { describe, it, expect, vi, beforeEach } from "vitest";
import { ref, type Ref } from "vue";
import { contract } from "../fixtures";

vi.mock("#build/icon-sheets.mjs", () => ({
  get contract() {
    return structuredClone(contract);
  },
}));

let states: Record<string, Ref<unknown>>;

vi.mock("#imports", () => ({
  useState: (key: string, init: () => unknown) => (states[key] ??= ref(init())),
}));

import { makeIconSheets } from "../../src/runtime/client";

const icon = { body: "<path/>", width: 24, height: 24 };

describe("makeIconSheets (nuxt client)", () => {
  beforeEach(() => {
    states = {};
  });

  it("builds a service over the reactive container", () => {
    const service = makeIconSheets();
    expect(service.resolve("home")).toEqual(contract.icons.home);
  });

  it("applies a set through the reactive container", () => {
    const service = makeIconSheets();
    service.apply({ id: "sharp", name: "Sharp", icons: { home: icon } });
    expect(service.resolve("home")).toEqual(icon);
  });
});
