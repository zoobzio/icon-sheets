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
});
