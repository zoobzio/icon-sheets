import { describe, it, expect, vi, beforeEach } from "vitest";

let assets: Record<string, unknown>;

vi.mock("#imports", () => ({
  defineNitroPlugin: (plugin: unknown) => plugin,
  useStorage: () => ({
    getItem: (key: string) => Promise.resolve(assets[key] ?? null),
  }),
}));

import plugin from "../../../src/runtime/server/sprite";

/** Runs the plugin and returns the HTML the `render:html` hook prepended. */
const render = async (): Promise<string> => {
  let handler:
    ((html: { bodyPrepend: string[] }) => void | Promise<void>) | undefined;
  const nitroApp = {
    hooks: {
      hook: (_name: string, fn: typeof handler) => {
        handler = fn;
      },
    },
  };
  (plugin as unknown as (app: typeof nitroApp) => void)(nitroApp);
  if (!handler) throw new Error("plugin did not register render:html");
  const html = { bodyPrepend: [] as string[] };
  await handler(html);
  return html.bodyPrepend.join("");
};

describe("sprite server plugin", () => {
  beforeEach(() => {
    assets = {
      "sprite.html": '<div id="icon-sheets-sprite"><svg></svg></div>',
    };
  });

  it("inlines the prebuilt sprite markup from the server asset", async () => {
    const markup = await render();
    expect(markup).toBe('<div id="icon-sheets-sprite"><svg></svg></div>');
  });

  it("prepends nothing when the asset is missing", async () => {
    assets = {};
    expect(await render()).toBe("");
  });
});
