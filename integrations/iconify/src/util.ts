import { IDENTIFIER } from "./constant";

/**
 * Serializes one value as TypeScript source, deterministically: insertion
 * order, double quotes, two-space indent, keys quoted only when they must be.
 * The emitted catalog is plain data — nested objects, strings, numbers,
 * booleans — with no shared references, so this is a straight recursive walk
 * with no reference-hoisting.
 */
export const serialize = (value: unknown, indent: string): string => {
  if (typeof value === "string") {
    return JSON.stringify(value);
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return "[]";
    }
    const inner = `${indent}  `;
    const items = value
      .map((entry) => `${inner}${serialize(entry, inner)}`)
      .join(",\n");
    return `[\n${items},\n${indent}]`;
  }
  if (typeof value === "object" && value !== null) {
    const members = Object.entries(value);
    if (members.length === 0) {
      return "{}";
    }
    const inner = `${indent}  `;
    const body = members
      .map(([key, entry]) => {
        let name = key;
        if (!IDENTIFIER.test(key)) {
          name = JSON.stringify(key);
        }
        return `${inner}${name}: ${serialize(entry, inner)}`;
      })
      .join(",\n");
    return `{\n${body},\n${indent}}`;
  }
  throw new Error(
    `@icon-sheets/iconify: cannot serialize a ${typeof value} into the generated config`,
  );
};
