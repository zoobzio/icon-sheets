import type { IconifyIcon } from "icon-sheets";

const icon = (body: string): IconifyIcon => ({ body, width: 24, height: 24 });

/**
 * A resolved base contract matching the `#build` stub's alias union
 * (`home` | `save`).
 */
export const contract = {
  id: "app",
  name: "App Icons",
  icons: {
    home: icon('<path d="M12 3 2 12h3v8h6v-6h2v6h6v-8h3z"/>'),
    save: icon('<path d="M5 3h11l3 3v15H5z"/>'),
  },
};

/**
 * The ref sets an app authors under `iconSheets.sets`, keyed for authoring
 * convenience. `round` carries discovery tags; `sharp` does not.
 */
export const sets = {
  sharp: { id: "sharp", name: "Sharp", icons: { home: "lucide:home" } },
  round: {
    id: "round",
    name: "Round",
    tags: ["soft"],
    icons: { home: "lucide:home-round" },
  },
};
