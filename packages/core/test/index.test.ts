import { describe, expect, it } from "vitest";

import type { Contract, IconifyIcon, Set } from "@icon-sheets/schema";

import { defineIconSheets } from "../src/service";
import { InvalidSetError } from "../src/error";

const home: IconifyIcon = { body: '<path d="M0 0"/>', width: 24, height: 24 };
const star: IconifyIcon = { body: "<circle/>", width: 24, height: 24 };
const sharpHome: IconifyIcon = { body: "<rect/>", width: 24, height: 24 };

// `satisfies` keeps the precise icon-key literal type, so `defineIconSheets`'s
// `const` inference yields a narrow `Alias` union and typos fail to compile.
const base = {
  id: "demo",
  name: "Demo",
  icons: { home, star },
} satisfies Contract;

const sharp: Set = {
  id: "sharp",
  name: "Sharp",
  icons: { home: sharpHome },
};

describe("defineIconSheets", () => {
  it("resolves an alias to its contract icon", () => {
    const icons = defineIconSheets(base);
    expect(icons.resolve("home").body).toContain("path");
    expect(icons.aliases().sort()).toEqual(["home", "star"]);
  });

  it("resolve of an unknown alias throws", () => {
    const icons = defineIconSheets(base);
    // @ts-expect-error "ghost" is not a declared alias
    expect(() => icons.resolve("ghost")).toThrow(/unknown alias/);
  });

  it("apply becomes the set over the baseline and clears the override", () => {
    const icons = defineIconSheets(base);
    icons.set("star", sharpHome);
    expect(icons.dirty()).toBe(true);

    icons.apply(sharp);
    expect(icons.config.contract.id).toBe("sharp");
    expect(icons.resolve("home").body).toBe("<rect/>");
    // The set does not rebind star, so it falls through to the baseline.
    expect(icons.resolve("star").body).toBe("<circle/>");
    // Applying a set clears the user override.
    expect(icons.dirty()).toBe(false);
  });

  it("apply resolves against the construction-time baseline, not the active contract", () => {
    const icons = defineIconSheets(base);
    icons.apply(sharp);
    // A second apply of a bare set restores every baseline icon.
    icons.apply({ id: "plain", name: "Plain" });
    expect(icons.resolve("home").body).toBe('<path d="M0 0"/>');
  });

  it("apply rejects a set overriding an unknown alias", () => {
    const icons = defineIconSheets(base);
    expect(() =>
      icons.apply({
        id: "bad",
        name: "Bad",
        // @ts-expect-error a set may only override known aliases
        icons: { ghost: sharpHome },
      }),
    ).toThrow(InvalidSetError);
  });

  it("update merges overrides into the active definition, surviving reset", () => {
    const icons = defineIconSheets(base);
    icons.update({ home: sharpHome });
    expect(icons.resolve("home").body).toBe("<rect/>");
    icons.reset();
    // update is a definition edit, not a user override, so reset does not undo it.
    expect(icons.resolve("home").body).toBe("<rect/>");
  });

  it("set writes a user override; reset restores it", () => {
    const icons = defineIconSheets(base);
    icons.set("home", sharpHome);
    expect(icons.resolve("home").body).toBe("<rect/>");
    expect(icons.dirty()).toBe(true);
    icons.reset();
    expect(icons.resolve("home").body).toBe('<path d="M0 0"/>');
    expect(icons.dirty()).toBe(false);
  });

  it("set is a silent no-op for an unknown alias or malformed icon", () => {
    const icons = defineIconSheets(base);
    // @ts-expect-error unknown alias
    icons.set("ghost", sharpHome);
    // @ts-expect-error malformed icon
    icons.set("home", { width: 24 });
    expect(icons.dirty()).toBe(false);
  });

  it("delta reports the drift from the baseline, re-appliable through update", () => {
    const icons = defineIconSheets(base);
    icons.set("home", sharpHome);
    const drift = icons.delta();
    expect(Object.keys(drift)).toEqual(["home"]);
    expect(drift.home?.body).toBe("<rect/>");

    const fresh = defineIconSheets(base);
    fresh.update(drift);
    expect(fresh.resolve("home").body).toBe("<rect/>");
  });

  it("delta is empty when nothing has drifted", () => {
    const icons = defineIconSheets(base);
    expect(icons.delta()).toEqual({});
  });

  it("create validates a set and returns it unchanged", () => {
    const icons = defineIconSheets(base);
    expect(icons.create(sharp)).toBe(sharp);
    expect(() =>
      icons.create({
        id: "bad",
        name: "Bad",
        // @ts-expect-error unknown alias
        icons: { ghost: sharpHome },
      }),
    ).toThrow(InvalidSetError);
  });

  it("extract snapshots the effective icons under a new identity", () => {
    const icons = defineIconSheets(base);
    icons.set("home", sharpHome);
    const snapshot = icons.extract({ id: "custom", name: "Custom" });
    expect(snapshot.id).toBe("custom");
    expect(snapshot.icons.home.body).toBe("<rect/>");
    expect(snapshot.icons.star.body).toBe("<circle/>");
  });
});
