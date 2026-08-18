import { mkdir, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

import type { IconifyIcon, IconifyJSON } from "@iconify/types";
import { defineIconSheets } from "@icon-sheets/icon-sheets";
import { defineCatalog } from "@icon-sheets/catalog";

import { generate, generateSet } from "../src/generate";
import { parseRef, plan } from "../src/refs";
import type { Req } from "../src/types";

/**
 * A mock collection served over the injected `req` — the Iconify-API path, since
 * the "mock" prefix is not installed as a local `@iconify-json/*` package.
 * Carries an `aliases` entry so alias-chain flattening is exercised.
 */
const collection: IconifyJSON = {
  prefix: "mock",
  width: 24,
  height: 24,
  icons: {
    home: { body: '<path d="M0 0"/>' },
    "content-save": { body: "<rect/>" },
    house: { body: "<house/>" },
  },
  aliases: {
    "home-alias": { parent: "house", hFlip: true },
  },
};

const urlIcon: IconifyIcon = { body: "<url-icon/>", width: 16, height: 16 };

/** Records every requested URL and answers from in-memory fixtures. */
const stub = (): { req: Req; requested: string[] } => {
  const requested: string[] = [];
  const req: Req = async (src) => {
    requested.push(src.href);
    if (src.hostname === "api.iconify.design") {
      return JSON.stringify(collection);
    }
    if (src.href === "https://icons.example.test/star.json") {
      return JSON.stringify(urlIcon);
    }
    if (src.href === "https://icons.example.test/bad.json") {
      return "not json at all";
    }
    throw new Error(`unexpected request: ${src.href}`);
  };
  return { req, requested };
};

describe("parseRef / plan", () => {
  it("parses a prefix:name ref into an iconify reference", () => {
    expect(parseRef("home", "lucide:home")).toEqual({
      scheme: "iconify",
      provider: "",
      prefix: "lucide",
      name: "home",
    });
  });

  it("parses a $/ ref into a url reference", () => {
    const parsed = parseRef("star", "$/icons.example.test/star.json");
    expect(parsed.scheme).toBe("url");
    if (parsed.scheme === "url") {
      expect(parsed.url.href).toBe("https://icons.example.test/star.json");
    }
  });

  it("throws on an unparseable ref, naming the alias", () => {
    expect(() => parseRef("home", "nonsense")).toThrow(/alias "home"/);
  });

  it("plans an icons map into parsed entries", () => {
    const entries = plan({ home: "mock:home", save: "mock:content-save" });
    expect(entries.map((entry) => entry.alias)).toEqual(["home", "save"]);
  });
});

describe("generate", () => {
  it("resolves refs into a contract literal carrying the authored identity", async () => {
    const { req } = stub();
    const result = await generate({
      config: {
        id: "app",
        name: "App Icons",
        tags: ["ui"],
        icons: { home: "mock:home", save: "mock:content-save" },
      },
      req,
    });
    expect(result.filename).toBe("icon-sheets.config.ts");
    expect(result.contents).toContain(
      `import { defineIconSheetsConfig } from "@icon-sheets/icon-sheets/config";`,
    );
    expect(result.contents).toContain("contract: {");
    expect(result.contents).toContain(`id: "app"`);
    expect(result.contents).toContain(`name: "App Icons"`);
    expect(result.contents).toContain(`body: "<path d=\\"M0 0\\"/>"`);
    // The collection-root width/height are baked into each resolved icon.
    expect(result.contents).toContain("width: 24");
  });

  it("batches acquisition into one request per prefix", async () => {
    const { req, requested } = stub();
    await generate({
      config: {
        id: "app",
        name: "App",
        icons: { home: "mock:home", save: "mock:content-save" },
      },
      req,
    });
    expect(requested).toHaveLength(1);
    expect(requested[0]).toContain("icons=home,content-save");
  });

  it("flattens an Iconify alias chain through getIconData", async () => {
    const { req } = stub();
    const result = await generate({
      config: { id: "a", name: "A", icons: { flipped: "mock:home-alias" } },
      req,
    });
    expect(result.contents).toContain("<house/>");
    expect(result.contents).toContain("hFlip: true");
  });

  it("resolves a $/ ref, and throws a ref-attributed error on a bad response", async () => {
    const { req } = stub();
    const ok = await generate({
      config: {
        id: "a",
        name: "A",
        icons: { star: "$/icons.example.test/star.json" },
      },
      req,
    });
    expect(ok.contents).toContain("<url-icon/>");

    await expect(
      generate({
        config: {
          id: "a",
          name: "A",
          icons: { star: "$/icons.example.test/bad.json" },
        },
        req,
      }),
    ).rejects.toThrow(/did not return JSON/);
  });

  it("collects every unresolvable ref into one error", async () => {
    const { req } = stub();
    await expect(
      generate({
        config: {
          id: "a",
          name: "A",
          icons: { ghost: "mock:missing", wraith: "mock:absent" },
        },
        req,
      }),
    ).rejects.toThrow(/ghost → mock:missing[\s\S]*wraith → mock:absent/);
  });

  it("lets a caller-supplied resolver override a scheme", async () => {
    const result = await generate({
      config: {
        id: "a",
        name: "A",
        icons: { star: "$/icons.example.test/star.json" },
      },
      resolvers: { url: async () => ({ body: "<custom-url/>" }) },
    });
    expect(result.contents).toContain("<custom-url/>");
  });
});

describe("generateSet", () => {
  it("emits a Set document as JSON under the given identity", async () => {
    const { req } = stub();
    const result = await generateSet({
      identity: { id: "sharp", name: "Sharp", tags: ["dense"] },
      aliases: ["home", "save"],
      icons: { home: "mock:content-save" },
      req,
    });
    expect(result.filename).toBe("sharp.set.json");
    const set = JSON.parse(result.contents);
    expect(set.id).toBe("sharp");
    expect(set.tags).toEqual(["dense"]);
    expect(set.icons.home.body).toBe("<rect/>");
    expect(set.icons.save).toBeUndefined();
  });

  it("rejects a ref key that is not one of the contract's aliases", async () => {
    const { req } = stub();
    await expect(
      generateSet({
        identity: { id: "bad", name: "Bad" },
        aliases: ["home"],
        icons: { ghost: "mock:home" },
        req,
      }),
    ).rejects.toThrow(/does not declare.*ghost/);
  });
});

describe("round trip", () => {
  it("generate → generateSet → serve through a catalog → apply → resolve", async () => {
    const { req } = stub();
    const built = await generate({
      config: {
        id: "app",
        name: "App",
        icons: { home: "mock:home", save: "mock:content-save" },
      },
      req,
    });

    // Evaluate the emitted config module.
    const out = new URL("./.generated/", import.meta.url);
    await mkdir(out, { recursive: true });
    await writeFile(new URL("./.gitignore", out), "*\n");
    const file = new URL("./icon-sheets.config.mjs", out);
    await writeFile(file, built.contents);
    const imported = await import(pathToFileURL(file.pathname).href);
    const contract = imported.default.contract;

    const icons = defineIconSheets(contract);
    expect(icons.aliases().sort()).toEqual(["home", "save"]);

    // Generate a set, serve its JSON through an in-memory catalog provider.
    const setFile = await generateSet({
      identity: { id: "sharp", name: "Sharp" },
      aliases: icons.aliases(),
      icons: { home: "mock:content-save" },
      req,
    });
    const stored: unknown = JSON.parse(setFile.contents);
    const catalog = defineCatalog(icons.schema, {
      list: () => ({ entries: [], total: 0, limit: 20, offset: 0 }),
      get: (id) => (id === "sharp" ? stored : undefined),
    });

    const got = await catalog.get("sharp");
    expect(got).toBeDefined();
    if (!got) {
      throw new Error("catalog missed the set it should have served");
    }

    icons.apply(got);
    expect(icons.resolve("home").body).toBe("<rect/>");
    // The set does not rebind save, so it falls through to the baseline.
    expect(icons.resolve("save").body).toBe("<rect/>");

    // reset / delta sanity on the applied contract.
    icons.set("home", { body: "<edited/>" });
    expect(Object.keys(icons.delta())).toEqual(["home"]);
    icons.reset();
    expect(icons.dirty()).toBe(false);
  });
});
