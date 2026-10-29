import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import type { IconifyIcon, IconifyJSON } from "@iconify/types";

import { parseRef, plan } from "../src/refs";
import { resolveKit } from "../src/resolve";
import type { KitConfig, Req } from "../src/types";

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

/** A temp project root holding the given SVG files, keyed by relative path. */
const project = async (files: Record<string, string>): Promise<string> => {
  const dir = await mkdtemp(join(tmpdir(), "icon-sheets-resolve-"));
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

/** A config with the given icons and nothing else. */
const only = (icons: Record<string, string>): KitConfig => ({
  id: "a",
  name: "A",
  icons,
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

describe("iconify refs", () => {
  it("resolves refs into a contract carrying the authored identity", async () => {
    const { req } = stub();
    const { contract } = await resolveKit(
      {
        id: "app",
        name: "App Icons",
        tags: ["ui"],
        icons: { home: "mock:home", save: "mock:content-save" },
      },
      { req },
    );
    expect(contract.id).toBe("app");
    expect(contract.name).toBe("App Icons");
    expect(contract.tags).toEqual(["ui"]);
    expect(contract.icons.home.body).toBe('<path d="M0 0"/>');
    // The collection-root width/height are baked into each resolved icon.
    expect(contract.icons.home.width).toBe(24);
  });

  it("acquires a prefix once across the contract and every set", async () => {
    const { req, requested } = stub();
    await resolveKit(
      {
        ...only({ home: "mock:home", save: "mock:content-save" }),
        sets: {
          sharp: { name: "Sharp", icons: { home: "mock:house" } },
          flip: { name: "Flip", icons: { save: "mock:home" } },
        },
      },
      { req },
    );
    expect(requested).toHaveLength(1);
    expect(requested[0]).toContain("icons=home,content-save,house");
  });

  it("flattens an Iconify alias chain through getIconData", async () => {
    const { req } = stub();
    const { contract } = await resolveKit(
      only({ flipped: "mock:home-alias" }),
      { req },
    );
    expect(contract.icons.flipped.body).toBe("<house/>");
    expect(contract.icons.flipped.hFlip).toBe(true);
  });

  it("collects every unresolvable ref into one error", async () => {
    const { req } = stub();
    await expect(
      resolveKit(only({ ghost: "mock:missing", wraith: "mock:absent" }), {
        req,
      }),
    ).rejects.toThrow(/ghost → mock:missing[\s\S]*wraith → mock:absent/);
  });
});

describe("url refs", () => {
  it("resolves a $/ ref, and throws a ref-attributed error on a bad response", async () => {
    const { req } = stub();
    const { contract } = await resolveKit(
      only({ star: "$/icons.example.test/star.json" }),
      { req },
    );
    expect(contract.icons.star.body).toBe("<url-icon/>");

    await expect(
      resolveKit(only({ star: "$/icons.example.test/bad.json" }), { req }),
    ).rejects.toThrow(/did not return JSON/);
  });
});

describe("file refs", () => {
  const resolveFile = async (svg: string) => {
    const cwd = await project({ "assets/logo.svg": svg });
    const { contract } = await resolveKit(only({ logo: "./assets/logo.svg" }), {
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
    const { contract } = await resolveKit(
      only({ one: "./one.svg", two: "./two.svg" }),
      { cwd },
    );
    expect(contract.icons.one.body).not.toBe(contract.icons.two.body);
  });

  it("collects a missing file as an unresolved ref", async () => {
    const cwd = await project({});
    await expect(
      resolveKit(only({ logo: "./nope.svg" }), { cwd }),
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

  it("reports each local file the refs name once, as an absolute path", async () => {
    const svg = '<svg viewBox="0 0 24 24"><path/></svg>';
    const cwd = await project({ "logo.svg": svg, "alt.svg": svg });
    const { req } = stub();
    const kit = await resolveKit(
      {
        ...only({ home: "mock:home", logo: "./logo.svg", mark: "./logo.svg" }),
        sets: { alt: { name: "Alt", icons: { logo: "./alt.svg" } } },
      },
      { cwd, req },
    );
    expect(kit.sources).toEqual([join(cwd, "logo.svg"), join(cwd, "alt.svg")]);
    expect(kit.sets).toEqual([
      {
        id: "alt",
        name: "Alt",
        icons: { logo: expect.objectContaining({ body: "<path/>" }) },
      },
    ]);
  });
});
