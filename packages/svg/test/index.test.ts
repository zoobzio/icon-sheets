import { describe, expect, it } from "vitest";

import type { Contract, IconifyIcon } from "@icon-sheets/schema";

import { defineSprite } from "../src/sprite";
import type { Source } from "../src/types";

type C = Contract & { icons: Record<"home" | "star", IconifyIcon> };

const icons: Record<string, IconifyIcon> = {
  home: { body: "<path/>", width: 24, height: 24 },
  star: { body: "<circle/>", width: 24, height: 24 },
};

const make = (): Source<C> => ({
  aliases: () => ["home", "star"],
  resolve: (alias) => icons[alias],
});

describe("defineSprite", () => {
  it("emits one symbol per alias, keyed by the bare alias", () => {
    const sheet = defineSprite(make()).sheet();
    expect(sheet).toContain('<symbol id="home"');
    expect(sheet).toContain('<symbol id="star"');
  });

  it("href is the constant #alias — stable across state changes", () => {
    const sprite = defineSprite(make());
    expect(sprite.href("home")).toBe("#home");
    expect(sprite.href("star")).toBe("#star");
  });

  it("renders a partial batch through symbols()", () => {
    const markup = defineSprite(make()).symbols(["home"]);
    expect(markup).toContain('<symbol id="home"');
    expect(markup).not.toContain('id="star"');
  });

  it("bakes Iconify transforms into the symbol body", () => {
    const source: Source<C> = {
      ...make(),
      resolve: () => ({ body: "<path/>", width: 24, height: 24, hFlip: true }),
    };
    expect(defineSprite(source).symbol("home")).toContain("transform");
  });

  it("hides the sheet by default and drops the style when hidden is false", () => {
    const sprite = defineSprite(make());
    expect(sprite.sheet()).toMatch(/^<svg [^>]*style="display:none"/);
    expect(sprite.sheet({ hidden: false })).not.toContain("display:none");
    expect(sprite.sheet({ hidden: false })).toContain('<symbol id="home"');
  });

  it("namespaces every id and href under a prefix", () => {
    const sprite = defineSprite(make(), { prefix: "ui-" });
    expect(sprite.href("home")).toBe("#ui-home");
    expect(sprite.symbol("home")).toContain('<symbol id="ui-home"');
    expect(sprite.sheet()).toContain('<symbol id="ui-star"');
    expect(sprite.sheet()).not.toContain('id="home"');
  });
});
