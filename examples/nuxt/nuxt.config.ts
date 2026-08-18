export default defineNuxtConfig({
  modules: ["@icon-sheets/nuxt"],

  // Icons are authored as Iconify refs; @icon-sheets/nuxt resolves them into a flat
  // contract at build time. The base contract draws from Lucide; each set
  // rebinds the same aliases with another collection's icons.
  iconSheets: {
    id: "lucide",
    name: "Lucide",
    icons: {
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
        id: "material",
        name: "Material Design",
        icons: {
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
        id: "tabler",
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
        id: "phosphor",
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
  },
});
