import { getIconData, quicklyValidateIconSet } from "@iconify/utils";
import { loadCollectionFromFS } from "@iconify/utils/lib/loader/fs";
import type { IconifyIcon, IconifyJSON } from "@iconify/types";

import { object } from "objectively";

import type { ParsedRef, Req, SchemeResolver } from "./types";
import { API_BASE } from "./constant";

/**
 * The default document loader: plain `fetch`, throwing on a non-OK status.
 * Carries no credentials — authenticated or offline sources go through a
 * caller-supplied {@link Req} instead.
 */
export const request: Req = async (src) => {
  const response = await fetch(src);
  if (!response.ok) {
    throw new Error(
      `@icon-sheets/iconify: fetching ${src.href} failed with ${response.status} ${response.statusText}`,
    );
  }
  return response.text();
};

/**
 * Whether a value is structurally an icon literal: an object with a string
 * `body`. A minimal gate on a `$/` response before the schema adjudicates the
 * full shape at assemble time.
 */
const isIcon = (value: unknown): value is IconifyIcon =>
  object(value) && typeof value.body === "string";

/**
 * Acquires every Iconify collection the refs draw from, one batched request per
 * prefix. A prefix is tried against local `@iconify-json/*` packages first
 * (`loadCollectionFromFS`, no auto-install); on a miss it falls back to the
 * Iconify API, requesting exactly the names used — through `req`, so the fetch
 * is interceptable — and validating the response with `quicklyValidateIconSet`.
 * Collections keyed by prefix; the `url`-scheme refs need no acquisition.
 *
 * @param refs - Every parsed ref across the config.
 * @param options - The working directory and the document loader.
 */
export const acquire = async (
  refs: ParsedRef[],
  options: { cwd: string; req: Req },
): Promise<Map<string, IconifyJSON>> => {
  const wanted = new Map<string, Set<string>>();
  for (const ref of refs) {
    if (ref.scheme !== "iconify") {
      continue;
    }
    const names = wanted.get(ref.prefix) ?? new Set<string>();
    names.add(ref.name);
    wanted.set(ref.prefix, names);
  }

  const collections = new Map<string, IconifyJSON>();
  for (const [prefix, names] of wanted) {
    const local = await loadCollectionFromFS(
      prefix,
      false,
      undefined,
      options.cwd,
    );
    if (local) {
      collections.set(prefix, local);
      continue;
    }
    const url = new URL(
      `${API_BASE}/${prefix}.json?icons=${[...names].join(",")}`,
    );
    const body = await options.req(url);
    const parsed = quicklyValidateIconSet(JSON.parse(body));
    if (!parsed) {
      throw new Error(
        `@icon-sheets/iconify: the response for "${prefix}" is not a valid IconifyJSON collection (${url.href})`,
      );
    }
    collections.set(prefix, parsed);
  }
  return collections;
};

/**
 * The `iconify`-scheme resolver: looks a `prefix:name` up in the acquired
 * collection via `getIconData`, which flattens the alias chain, merges
 * transforms, and bakes in the collection-root defaults — so the returned icon
 * is self-contained and stored directly. A miss (unknown prefix or name)
 * returns `null` for the collected-misses pass.
 *
 * @param collections - The acquired collections, keyed by prefix.
 */
export const iconifyResolver =
  (collections: Map<string, IconifyJSON>): SchemeResolver =>
  async (ref) => {
    if (ref.scheme !== "iconify") {
      return null;
    }
    const collection = collections.get(ref.prefix);
    if (!collection) {
      return null;
    }
    return getIconData(collection, ref.name);
  };

/**
 * The `url`-scheme resolver: fetches `https://host/path` through `req`, expects
 * a single icon literal as JSON, and returns it. A non-JSON or non-icon
 * response is a hard failure — the endpoint's contract is broken — so it throws
 * naming the URL rather than being collected as a miss.
 *
 * @param req - The document loader every fetch passes through.
 */
export const urlResolver =
  (req: Req): SchemeResolver =>
  async (ref) => {
    if (ref.scheme !== "url") {
      return null;
    }
    const body = await req(ref.url);
    let value: unknown;
    try {
      value = JSON.parse(body);
    } catch {
      throw new Error(
        `@icon-sheets/iconify: ${ref.url.href} did not return JSON`,
      );
    }
    if (!isIcon(value)) {
      throw new Error(
        `@icon-sheets/iconify: ${ref.url.href} did not return an icon — expected { body: string, ... }`,
      );
    }
    return value;
  };
