import type { Issue } from "@icon-sheets/schema";

import { SchemaError } from "@icon-sheets/schema";

/**
 * Raised when the contract handed to {@link defineIconSheets} violates its own
 * shape. Extends {@link SchemaError}, so it carries the underlying
 * {@link Issue}s while naming which boundary rejected the value.
 */
export class InvalidContractError extends SchemaError {
  constructor(issues: Issue[]) {
    super(issues);
    this.name = "InvalidContractError";
  }
}

/**
 * Raised when a set handed to `apply` / `create` steps outside the contract —
 * a bad identity, or an override on an alias the contract does not declare.
 * Carries the {@link Issue}s of the failed {@link SchemaError}.
 */
export class InvalidSetError extends SchemaError {
  constructor(issues: Issue[]) {
    super(issues);
    this.name = "InvalidSetError";
  }
}

/**
 * Raised when the overrides map handed to `update` steps outside the contract.
 * Carries the {@link Issue}s of the failed {@link SchemaError}.
 */
export class InvalidOverridesError extends SchemaError {
  constructor(issues: Issue[]) {
    super(issues);
    this.name = "InvalidOverridesError";
  }
}

/**
 * Raised when an alias is resolved that the contract does not declare. A lookup
 * miss, not a contract violation, so it extends the plain {@link Error} while
 * carrying the offending `alias`.
 */
export class UnknownAliasError extends Error {
  readonly alias: string;

  constructor(alias: string) {
    super(`icon-sheets: unknown alias "${alias}"`);
    this.name = "UnknownAliasError";
    this.alias = alias;
  }
}

/**
 * Runs `fn`, and if it throws a {@link SchemaError}, re-throws it as the given
 * semantic subclass carrying the same {@link Issue}s; anything else propagates
 * untouched. Lets the service speak in {@link InvalidContractError} /
 * {@link InvalidSetError} / {@link InvalidOverridesError} while the schema layer
 * stays generic.
 */
export const reframe = <T>(
  Semantic: new (issues: Issue[]) => SchemaError,
  fn: () => T,
): T => {
  try {
    return fn();
  } catch (error) {
    if (error instanceof SchemaError) {
      throw new Semantic(error.issues);
    }
    throw error;
  }
};
