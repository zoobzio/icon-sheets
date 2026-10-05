import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import type { IconifyIcon, IconifyJSON } from "@iconify/types";
import { defineIconSheets } from "icon-sheets";
import { defineCatalog } from "@icon-sheets/catalog";

import { resolveAll, resolveContract, resolveSet } from "../src/resolve";
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

const dirs: string[] = [];

/** A temp working directory holding the given SVG files, keyed by relative path. */
const project = async (files: Record<string, string>): Promise<string> => {
  const dir = await mkdtemp(join(tmpdir(), "icon-sheets-iconify-"));
  dirs.push(dir);
  for (const [path, contents] of Object.entries(files)) {
    await mkdir(join(dir, path, ".."), { recursive: true });
    await writeFile(join(dir, path), contents);
  }
  return dir;
};

afterEach(async () => {
  await Promise.all(
    dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  );
});

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

  it("parses a ./ or ../ ref into a file reference", () => {
    expect(parseRef("logo", "./assets/logo.svg")).toEqual({
      scheme: "file",
      path: "./assets/logo.svg",
    });
    expect(parseRef("logo", "../shared/logo.svg")).toEqual({
      scheme: "file",
      path: "../shared/logo.svg",
    });
  });

  it("throws on an unparseable ref, naming the alias", () => {
    expect(() => parseRef("home", "nonsense")).toThrow(/alias "home"/);
  });

  it("plans an icons map into parsed entries", () => {
    const entries = plan({ home: "mock:home", save: "mock:content-save" });
    expect(entries.map((entry) => entry.alias)).toEqual(["home", "save"]);
  });
});

describe("resolveContract", () => {
  it("resolves refs into a contract carrying the authored identity", async () => {
    const { req } = stub();
    const contract = await resolveContract({
      config: {
        id: "app",
        name: "App Icons",
        tags: ["ui"],
        icons: { home: "mock:home", save: "mock:content-save" },
      },
      req,
    });
    expect(contract.id).toBe("app");
    expect(contract.name).toBe("App Icons");
    expect(contract.tags).toEqual(["ui"]);
    expect(contract.icons.home.body).toBe('<path d="M0 0"/>');
    // The collection-root width/height are baked into each resolved icon.
    expect(contract.icons.home.width).toBe(24);
  });

  it("batches acquisition into one request per prefix", async () => {
    const { req, requested } = stub();
    await resolveContract({
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
    const contract = await resolveContract({
      config: { id: "a", name: "A", icons: { flipped: "mock:home-alias" } },
      req,
    });
    expect(contract.icons.flipped.body).toBe("<house/>");
    expect(contract.icons.flipped.hFlip).toBe(true);
  });

  it("resolves a $/ ref, and throws a ref-attributed error on a bad response", async () => {
    const { req } = stub();
    const ok = await resolveContract({
      config: {
        id: "a",
        name: "A",
        icons: { star: "$/icons.example.test/star.json" },
      },
      req,
    });
    expect(ok.icons.star.body).toBe("<url-icon/>");

    await expect(
      resolveContract({
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
      resolveContract({
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
    const contract = await resolveContract({
      config: {
        id: "a",
        name: "A",
        icons: { star: "$/icons.example.test/star.json" },
      },
      resolvers: { url: async () => ({ body: "<custom-url/>" }) },
    });
    expect(contract.icons.star.body).toBe("<custom-url/>");
  });
});

describe("file refs", () => {
  const resolveFile = async (svg: string) => {
    const cwd = await project({ "assets/logo.svg": svg });
    const contract = await resolveContract({
      config: { id: "a", name: "A", icons: { logo: "./assets/logo.svg" } },
      cwd,
    });
    return contract.icons.logo;
  };

  it("reads a local SVG into an icon literal", async () => {
    const icon = await resolveFile(
      '<?xml version="1.0"?>\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 16"><path d="M1 1"/></svg>\n',
    );
    expect(icon).toEqual({
      body: '<path d="M1 1"/>',
      left: 0,
      top: 0,
      width: 32,
      height: 16,
    });
  });

  it("keeps the root's presentation attributes", async () => {
    const icon = await resolveFile(
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M1 1"/></svg>',
    );
    expect(icon.body).toBe(
      '<g fill="none" stroke="currentColor"><path d="M1 1"/></g>',
    );
  });

  it("namespaces ids and their references, the same on every run", async () => {
    const svg =
      '<svg viewBox="0 0 24 24"><defs><linearGradient id="a"/><clipPath id="ab"/></defs>' +
      '<path fill="url(#a)" clip-path="url(#ab)"/><use href="#a"/></svg>';
    const icon = await resolveFile(svg);
    const scope = /id="(i[0-9a-f]{8}-)a"/.exec(icon.body)?.[1];
    expect(scope).toBeDefined();
    expect(icon.body).toContain(`id="${scope}ab"`);
    expect(icon.body).toContain(`fill="url(#${scope}a)"`);
    expect(icon.body).toContain(`clip-path="url(#${scope}ab)"`);
    expect(icon.body).toContain(`href="#${scope}a"`);
    expect((await resolveFile(svg)).body).toBe(icon.body);
  });

  it("scopes two files' ids apart", async () => {
    const svg = '<svg viewBox="0 0 24 24"><path id="a"/></svg>';
    const cwd = await project({ "one.svg": svg, "two.svg": svg });
    const { icons } = await resolveContract({
      config: {
        id: "a",
        name: "A",
        icons: { one: "./one.svg", two: "./two.svg" },
      },
      cwd,
    });
    expect(icons.one.body).not.toBe(icons.two.body);
  });

  it("collects a missing file as an unresolved ref", async () => {
    const cwd = await project({});
    await expect(
      resolveContract({
        config: { id: "a", name: "A", icons: { logo: "./nope.svg" } },
        cwd,
      }),
    ).rejects.toThrow(/could not be resolved[\s\S]*logo → \.\/nope\.svg/);
  });

  it("rejects a file that is not an SVG", async () => {
    await expect(resolveFile("<html></html>")).rejects.toThrow(
      /\.\/assets\/logo\.svg is not an SVG/,
    );
  });

  it("rejects an SVG without a viewBox", async () => {
    await expect(
      resolveFile('<svg width="24" height="24"><path/></svg>'),
    ).rejects.toThrow(/no usable "viewBox"/);
  });

  it("rejects a namespace the sprite would leave unbound", async () => {
    await expect(
      resolveFile(
        '<svg viewBox="0 0 24 24" xmlns:xlink="http://www.w3.org/1999/xlink"><use xlink:href="#a"/><sodipodi:namedview/></svg>',
      ),
    ).rejects.toThrow(/"sodipodi:", "xlink:" namespace/);
  });

  it("leaves xml: attributes and style declarations alone", async () => {
    const icon = await resolveFile(
      '<svg viewBox="0 0 24 24"><text xml:space="preserve" style="fill:red; stroke:blue ;">a</text></svg>',
    );
    expect(icon.body).toContain("xml:space");
  });

  it("lets a caller-supplied resolver override the file scheme", async () => {
    const contract = await resolveContract({
      config: { id: "a", name: "A", icons: { logo: "./logo.svg" } },
      resolvers: { file: async () => ({ body: "<custom/>" }) },
    });
    expect(contract.icons.logo.body).toBe("<custom/>");
  });
});

describe("resolveSet", () => {
  it("resolves a Set document under the given identity", async () => {
    const { req } = stub();
    const set = await resolveSet({
      identity: { id: "sharp", name: "Sharp", tags: ["dense"] },
      aliases: ["home", "save"],
      icons: { home: "mock:content-save" },
      req,
    });
    expect(set.id).toBe("sharp");
    expect(set.tags).toEqual(["dense"]);
    expect(set.icons?.home?.body).toBe("<rect/>");
    expect(set.icons?.save).toBeUndefined();
  });

  it("rejects a ref key that is not one of the contract's aliases", async () => {
    const { req } = stub();
    await expect(
      resolveSet({
        identity: { id: "bad", name: "Bad" },
        aliases: ["home"],
        icons: { ghost: "mock:home" },
        req,
      }),
    ).rejects.toThrow(/does not declare.*ghost/);
  });
});

describe("resolveAll", () => {
  const config = {
    id: "app",
    name: "App",
    icons: { home: "mock:home", save: "mock:content-save" },
  };
  const sharp = {
    id: "sharp",
    name: "Sharp",
    tags: ["dense"],
    icons: { home: "mock:house" },
  };

  it("resolves the same documents as resolveContract and resolveSet", async () => {
    const { req } = stub();
    const resolved = await resolveAll({ config, sets: [sharp], req });

    const { icons, ...identity } = sharp;
    expect(resolved.contract).toEqual(await resolveContract({ config, req }));
    expect(resolved.sets).toEqual([
      await resolveSet({
        identity,
        aliases: Object.keys(config.icons),
        icons,
        req,
      }),
    ]);
  });

  it("acquires a prefix once across the contract and every set", async () => {
    const { req, requested } = stub();
    await resolveAll({
      config,
      sets: [sharp, { id: "flip", name: "Flip", icons: { save: "mock:home" } }],
      req,
    });
    expect(requested).toHaveLength(1);
    expect(requested[0]).toContain("icons=home,content-save,house");
  });

  it("reports each local file the refs name once, as an absolute path", async () => {
    const svg = '<svg viewBox="0 0 24 24"><path/></svg>';
    const cwd = await project({ "logo.svg": svg, "alt.svg": svg });
    const { req } = stub();
    const resolved = await resolveAll({
      config: {
        id: "app",
        name: "App",
        icons: { home: "mock:home", logo: "./logo.svg", mark: "./logo.svg" },
      },
      sets: [{ id: "alt", name: "Alt", icons: { logo: "./alt.svg" } }],
      cwd,
      req,
    });
    expect(resolved.sources).toEqual([
      join(cwd, "logo.svg"),
      join(cwd, "alt.svg"),
    ]);
    expect(resolved.sets).toEqual([
      {
        id: "alt",
        name: "Alt",
        icons: { logo: expect.objectContaining({ body: "<path/>" }) },
      },
    ]);
  });

  it("rejects a set that rebinds an alias the config does not declare", async () => {
    const { req, requested } = stub();
    await expect(
      resolveAll({
        config,
        sets: [{ id: "bad", name: "Bad", icons: { ghost: "mock:home" } }],
        req,
      }),
    ).rejects.toThrow(/does not declare.*ghost/);
    expect(requested).toHaveLength(0);
  });
});

describe("round trip", () => {
  it("resolveContract → resolveSet → serve through a catalog → apply → resolve", async () => {
    const { req } = stub();
    const contract = await resolveContract({
      config: {
        id: "app",
        name: "App",
        icons: { home: "mock:home", save: "mock:content-save" },
      },
      req,
    });

    const icons = defineIconSheets(contract);
    expect(icons.aliases().sort()).toEqual(["home", "save"]);

    // Resolve a set, serve it as JSON through an in-memory catalog provider.
    const set = await resolveSet({
      identity: { id: "sharp", name: "Sharp" },
      aliases: icons.aliases(),
      icons: { home: "mock:content-save" },
      req,
    });
    const stored: unknown = JSON.parse(JSON.stringify(set));
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
