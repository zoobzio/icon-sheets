import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

let assets: Record<string, unknown>;
let runtime: {
  iconSheets?: {
    base?: string;
    headers?: Record<string, string>;
    token?: string;
  };
};

vi.mock("h3", () => ({
  defineEventHandler: (handler: unknown) => handler,
  getRouterParam: (event: { params?: Record<string, string> }, name: string) =>
    event.params?.[name],
  createError: (input: { statusCode: number; statusMessage: string }) =>
    Object.assign(new Error(input.statusMessage), input),
}));

vi.mock("#imports", () => ({
  useStorage: () => ({
    getItem: (key: string) => Promise.resolve(assets[key] ?? null),
  }),
  useRuntimeConfig: () => runtime,
}));

import handler from "../../../src/runtime/server/get";

type GetRoute = (event: {
  params?: Record<string, string>;
}) => Promise<unknown>;
const get = handler as unknown as GetRoute;

const sharp = { id: "sharp", name: "Sharp", icons: {} };

describe("catalog retrieval route", () => {
  beforeEach(() => {
    assets = { "sets.json": { sharp } };
    runtime = { iconSheets: {} };
  });

  describe("local (build-emitted) sets", () => {
    it("answers with the stored set for the id", async () => {
      await expect(get({ params: { id: "sharp" } })).resolves.toEqual(sharp);
    });

    it("answers 404 for a miss", async () => {
      await expect(get({ params: { id: "ghost" } })).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it("answers 400 when no id is carried", async () => {
      await expect(get({})).rejects.toMatchObject({ statusCode: 400 });
    });

    it("answers 500 when the payload record is missing", async () => {
      assets = {};
      await expect(get({ params: { id: "sharp" } })).rejects.toMatchObject({
        statusCode: 500,
      });
    });
  });

  describe("remote catalog proxy", () => {
    const fetchMock = vi.fn();

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

    it("proxies to the remote catalog with the bearer token", async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => sharp,
      });

      await expect(get({ params: { id: "sharp" } })).resolves.toEqual(sharp);

      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe("https://vendor.test/api/sets/sharp");
      expect(init.headers.authorization).toBe("Bearer sk_live");
    });

    it("maps an upstream 404 to a miss", async () => {
      fetchMock.mockResolvedValue({ ok: false, status: 404 });
      await expect(get({ params: { id: "ghost" } })).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it("maps other upstream failures to 502", async () => {
      fetchMock.mockResolvedValue({ ok: false, status: 500 });
      await expect(get({ params: { id: "sharp" } })).rejects.toMatchObject({
        statusCode: 502,
      });
    });
  });
});
