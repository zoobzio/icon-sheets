import { describe, it, expect, vi } from "vitest";
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";

vi.mock("#build/icon-sheets.mjs", () => ({ prefix: "ui-" }));

import Icon from "../../src/runtime/component/Icon";

describe("Icon", () => {
  it("references the alias under the configured prefix", async () => {
    const app = createSSRApp({ render: () => h(Icon, { name: "home" }) });
    const html = await renderToString(app);
    expect(html).toContain('<use href="#ui-home">');
    expect(html).toContain('aria-hidden="true"');
  });
});
