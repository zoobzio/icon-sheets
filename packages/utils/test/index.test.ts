import { describe, expect, it } from "vitest";

import type { Contract, IconifyIcon, Set } from "@icon-sheets/schema";

import { clone } from "../src/clone";
import { copy } from "../src/copy";
import { merge } from "../src/merge";

const a: IconifyIcon = { body: "x", width: 24 };
const b: IconifyIcon = { body: "y", width: 24 };

const contract: Contract = {
  id: "demo",
  name: "Demo",
  tags: ["ui"],
  icons: { home: a, star: a },
};

describe("copy", () => {
  it("deep-copies records and arrays, detaching from the source", () => {
    const source = { list: [1, 2], nested: { x: 1 } };
    const out = copy(source);
    expect(out).toEqual(source);
    expect(out.list).not.toBe(source.list);
    expect(out.nested).not.toBe(source.nested);
  });
});

describe("clone", () => {
  it("deep-copies identity and icons into a detached snapshot", () => {
    const out = clone(contract);
    expect(out).toEqual(contract);
    expect(out.icons).not.toBe(contract.icons);
    expect(out.tags).not.toBe(contract.tags);
    expect(out.icons.home).toEqual(a);
    expect(out.icons.home).not.toBe(a);
  });
});

describe("merge", () => {
  it("takes identity from the set and falls icons through to the baseline", () => {
    const set: Set = {
      id: "sharp",
      name: "Sharp",
      icons: { home: b },
    };
    const out = merge(contract, set);
    expect(out.id).toBe("sharp");
    expect(out.name).toBe("Sharp");
    // The set's overrides are detached; the fall-through icons are shared from
    // the baseline by reference (a shallow spread of the contract's icons).
    expect(out.icons.home).toEqual(b);
    expect(out.icons.home).not.toBe(b);
    expect(out.icons.star).toBe(a);
  });

  it("detaches the set's tags", () => {
    const set: Set = { id: "s", name: "S", tags: ["dark"] };
    const out = merge(contract, set);
    expect(out.tags).toEqual(["dark"]);
    expect(out.tags).not.toBe(set.tags);
  });
});
