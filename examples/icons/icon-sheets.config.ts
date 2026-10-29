import { defineConfig } from "@icon-sheets/kit";

// The icons of the examples, authored once as refs. Most aliases draw from
// Iconify collections; `logo` and `badge` are local SVGs in src/. The base
// contract draws from Lucide, and each set rebinds the same aliases with
// another collection's icons. `logo` is bound only here, so every set keeps
// it; the Material set rebinds `badge` to a second local file.
//
// `icon-sheets build` resolves every ref into .dist/, and package.json
// exports that build, so an app names this package as its preset.
export default defineConfig({
  id: "lucide",
  name: "Lucide",
  icons: {
    logo: "./src/logo.svg",
    badge: "./src/badge.svg",
    home: "lucide:home",
    search: "lucide:search",
    settings: "lucide:settings",
    user: "lucide:user",
    heart: "lucide:heart",
    star: "lucide:star",
    trash: "lucide:trash-2",
    bell: "lucide:bell",
  },
  sets: {
    material: {
      name: "Material Design",
      icons: {
        badge: "./src/badge-flat.svg",
        home: "mdi:home",
        search: "mdi:magnify",
        settings: "mdi:cog",
        user: "mdi:account",
        heart: "mdi:heart",
        star: "mdi:star",
        trash: "mdi:delete",
        bell: "mdi:bell",
      },
    },
    tabler: {
      name: "Tabler",
      icons: {
        home: "tabler:home",
        search: "tabler:search",
        settings: "tabler:settings",
        user: "tabler:user",
        heart: "tabler:heart",
        star: "tabler:star",
        trash: "tabler:trash",
        bell: "tabler:bell",
      },
    },
    phosphor: {
      name: "Phosphor",
      icons: {
        home: "ph:house",
        search: "ph:magnifying-glass",
        settings: "ph:gear",
        user: "ph:user",
        heart: "ph:heart",
        star: "ph:star",
        trash: "ph:trash",
        bell: "ph:bell",
      },
    },
  },
  outDir: ".dist",
});
