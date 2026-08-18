<script setup lang="ts">
import type { Page } from "icon-sheets/catalog";
import { defineClient } from "icon-sheets/catalog";

const icons = useIconSheets();
const catalog = defineClient(icons.schema, { base: "/api/icon-sheets" });

const aliases = icons.aliases();

// The switcher options: the baseline contract plus every override set the
// catalog serves.
const { data: sets } = await useFetch<Page>("/api/icon-sheets/sets");
const options = computed(() => [
  { id: icons.schema.base.id, name: icons.schema.base.name },
  ...(sets.value?.entries ?? []),
]);

const active = ref(icons.config.contract.id);

async function choose(id: string) {
  if (id === icons.schema.base.id) {
    // Applying an icon-less set resets to the construction-time baseline.
    icons.apply({ id: icons.schema.base.id, name: icons.schema.base.name });
  } else {
    const set = await catalog.get(id);
    if (set) icons.apply(set);
  }
  active.value = id;
}
</script>

<template>
  <main>
    <h1>icon-sheets × Nuxt</h1>
    <p>
      One semantic contract of icon aliases, rendered from an inline SVG sprite.
      Pick a set to <code>apply</code> it — every
      <code>&lt;use href="#alias"&gt;</code> stays the same, only the symbol
      body behind it swaps.
    </p>

    <nav class="switcher">
      <button
        v-for="option in options"
        :key="option.id"
        :class="{ active: option.id === active }"
        @click="choose(option.id)"
      >
        {{ option.name }}
      </button>
    </nav>

    <table>
      <thead>
        <tr>
          <th>Alias</th>
          <th>Reference</th>
          <th>Icon</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="alias in aliases" :key="alias">
          <td>
            <code>{{ alias }}</code>
          </td>
          <td>
            <code>#{{ alias }}</code>
          </td>
          <td class="icon"><Icon :name="alias" /></td>
        </tr>
      </tbody>
    </table>
  </main>
</template>

<style>
:root {
  color-scheme: light dark;
}
body {
  font-family: system-ui, sans-serif;
  margin: 0;
}
main {
  max-width: 42rem;
  margin: 3rem auto;
  padding: 0 1.5rem;
}
h1 {
  margin-bottom: 0.25rem;
}
p {
  color: #888;
  line-height: 1.5;
}
.switcher {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin: 1.5rem 0;
}
.switcher button {
  padding: 0.5rem 0.9rem;
  border: 1px solid #8886;
  border-radius: 0.5rem;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font: inherit;
}
.switcher button.active {
  border-color: currentColor;
  font-weight: 600;
}
table {
  width: 100%;
  border-collapse: collapse;
}
th,
td {
  text-align: left;
  padding: 0.6rem 0.5rem;
  border-bottom: 1px solid #8883;
}
.icon {
  font-size: 1.75rem;
}
code {
  font-family: ui-monospace, monospace;
}
</style>
