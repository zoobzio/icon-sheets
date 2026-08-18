import { describe, expect, it } from "vitest";

import { makeIconSheets } from "../src/index";
import { defineIconSheetsConfig, useIconSheetsConfig } from "../src/config";

const config = defineIconSheetsConfig({
  contract: {
    id: "app",
    name: "App",
    icons: { home: { body: "<path/>", width: 24 } },
  },
});

describe("icon-sheets config", () => {
  it("seeds a detached container per call — safe for concurrent sessions", () => {
    const a = useIconSheetsConfig(config);
    const b = useIconSheetsConfig(config);
    expect(a.contract).not.toBe(b.contract);
    expect(a.override).toEqual({});
  });

  it("boots a service that resolves the contract's aliases", () => {
    const icons = makeIconSheets(useIconSheetsConfig(config));
    expect(icons.resolve("home").body).toContain("path");
  });
});
