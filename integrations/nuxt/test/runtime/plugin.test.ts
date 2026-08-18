import { describe, it, expect, vi, beforeEach } from "vitest";
import { ref, type Ref } from "vue";
import { contract } from "../fixtures";

vi.mock("#build/icon-sheets.mjs", () => ({
  get contract() {
    return structuredClone(contract);
  },
}));

vi.mock("#app", () => ({
  defineNuxtPlugin: (def: unknown) => def,
}));

let states: Record<string, Ref<unknown>>;

vi.mock("#imports", () => ({
  useState: (key: string, init: () => unknown) => (states[key] ??= ref(init())),
}));

import plugin from "../../src/runtime/plugin";

const callHook = vi.fn();

const setup = async () => {
  const result = await plugin.setup({ callHook } as never);
  if (
    !result ||
    typeof result !== "object" ||
    !("provide" in result) ||
    !result.provide
  ) {
    throw new Error("plugin did not provide a service");
  }
  return result.provide;
};

describe("icon-sheets plugin", () => {
  beforeEach(() => {
    states = {};
    callHook.mockClear();
  });

  it("is named icon-sheets", () => {
    expect(plugin.name).toBe("icon-sheets");
  });

  it("provides the icon-sheets service", async () => {
    const provide = await setup();
    expect(provide.iconSheets).toBeDefined();
  });

  it("emits icon-sheets:ready with the service", async () => {
    const provide = await setup();
    expect(callHook).toHaveBeenCalledWith(
      "icon-sheets:ready",
      provide.iconSheets,
    );
  });
});
