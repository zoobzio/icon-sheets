import type { AppConfig } from "./types";

import { useIconSheetsConfig } from "icon-sheets/config";
import { useState } from "#imports";
import { contract } from "#build/icon-sheets.mjs";

/**
 * The per-request state the plugin and composable share. The build module's
 * contract is a process-wide singleton, so every seed is a detached clone —
 * never a reference SSR writes could reach across requests.
 */
export const accessIconSheets = () => {
  const config = useState<AppConfig>("icon-sheets:config", () =>
    useIconSheetsConfig({ contract }),
  );

  return { config };
};
