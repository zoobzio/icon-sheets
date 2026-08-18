// Typecheck-only stub for the Nuxt `#imports` virtual module.
import type { Ref } from "vue";

export declare function useState<T>(key: string, init: () => T): Ref<T>;

export declare function useRuntimeConfig(): {
  iconSheets?: {
    base?: string;
    headers?: Record<string, string>;
    token?: string;
  };
};

// Nitro's storage surface, as far as the server routes reach into it. The read
// stays `unknown` so handlers prove what storage hands back.
export declare function useStorage(base?: string): {
  getItem: (key: string) => Promise<unknown>;
};

interface NitroRenderHtml {
  bodyPrepend: string[];
}

interface NitroApp {
  hooks: {
    hook: (
      name: "render:html",
      handler: (html: NitroRenderHtml) => void | Promise<void>,
    ) => void;
  };
}

export declare function defineNitroPlugin(
  plugin: (nitroApp: NitroApp) => void,
): (nitroApp: NitroApp) => void;
