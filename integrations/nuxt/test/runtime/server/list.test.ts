import type { Page } from "@icon-sheets/icon-sheets/catalog";

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

let assets: Record<string, unknown>;
let query: { q?: string };
let runtime: {
  iconSheets?: {
    base?: string;
    headers?: Record<string, string>;
    token?: string;
  };
};

vi.mock("h3", () => ({
  defineEventHandler: (handler: unknown) => handler,
  getQuery: () => query,
  createError: (input: { statusCode: number; statusMessage: string }) =>
    Object.assign(new Error(input.statusMessage), input),
}));

vi.mock("#imports", () => ({
  useStorage: () => ({
    getItem: (key: string) => Promise.resolve(assets[key] ?? null),
  }),
  useRuntimeConfig: () => runtime,
}));

import handler from "../../../src/runtime/server/list";

const list = handler as unknown as (event: unknown) => Promise<Page>;

const entries = [
  { id: "sharp", name: "Sharp" },
  { id: "round", name: "Round", tags: ["soft"] },
];

describe("catalog listing route", () => {
  beforeEach(() => {
    assets = { "entries.json": entries };
    query = {};
    runtime = { iconSheets: {} };
  });

  describe("local (build-emitted) manifest", () => {
    it("lists all entries under the default window, sorted by name", async () => {
      const page = await list({});
      expect(page.entries.map((entry) => entry.id)).toEqual(["round", "sharp"]);
      expect(page.total).toBe(2);
    });

    it("filters by search", async () => {
      query = { q: JSON.stringify({ search: "sharp" }) };
      const page = await list({});
      expect(page.entries.map((entry) => entry.id)).toEqual(["sharp"]);
    });

    it("filters by tags", async () => {
      query = { q: JSON.stringify({ tags: ["soft"] }) };
      const page = await list({});
      expect(page.entries.map((entry) => entry.id)).toEqual(["round"]);
    });

    it("rejects a malformed query", async () => {
      query = { q: "{not json" };
      await expect(list({})).rejects.toMatchObject({ statusCode: 400 });
    });

    it("answers 500 when the manifest is missing", async () => {
      assets = {};
      await expect(list({})).rejects.toMatchObject({ statusCode: 500 });
    });
  });

  describe("remote catalog proxy", () => {
    const fetchMock = vi.fn();
    const page: Page = { entries: [], total: 0, limit: 20, offset: 0 };

    beforeEach(() => {
      runtime = {
        iconSheets: { base: "https://vendor.test/api", token: "sk_live" },
      };
      vi.stubGlobal("fetch", fetchMock);
      fetchMock.mockReset();
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("proxies the query to the remote catalog with the bearer token", async () => {
      query = { q: JSON.stringify({ search: "x" }) };
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => page,
      });

      await expect(list({})).resolves.toEqual(page);

      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe(
        `https://vendor.test/api/sets?q=${encodeURIComponent(query.q!)}`,
      );
      expect(init.headers.authorization).toBe("Bearer sk_live");
    });

    it("maps an upstream failure to 502", async () => {
      fetchMock.mockResolvedValue({ ok: false, status: 500 });
      await expect(list({})).rejects.toMatchObject({ statusCode: 502 });
    });
  });
});
