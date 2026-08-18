import type { Issue } from "@icon-sheets/schema";

import { SchemaError } from "@icon-sheets/schema";

/**
 * Raised when a value handed to {@link Catalog.list} is not a {@link Query}.
 * Carries no {@link Issue}s — the query model is structural, not part of an icon
 * contract — so it extends the plain {@link Error} while carrying the offending
 * `value`.
 */
export class MalformedQueryError extends Error {
  readonly value: unknown;

  constructor(value: unknown) {
    super("value is not a catalog query");
    this.name = "MalformedQueryError";
    this.value = value;
  }
}

/**
 * Raised when a source answers a listing with something that is not a
 * {@link Page} — a broken source, never a state a caller can reach through its
 * own input. Like {@link MalformedQueryError} it extends the plain
 * {@link Error}, carrying the offending `value`.
 */
export class MalformedPageError extends Error {
  readonly value: unknown;

  constructor(value: unknown) {
    super("source answered a listing with something that is not a page");
    this.name = "MalformedPageError";
    this.value = value;
  }
}

/**
 * Raised when a source answers a retrieval with a payload that fails the
 * contract — corruption, deliberately distinct from the miss that resolves
 * `undefined`, so a broken payload can never pass as an absent one. Extends
 * {@link SchemaError} with the contract's {@link Issue}s, and carries the `id`
 * the payload was retrieved under.
 */
export class MalformedSetError extends SchemaError {
  readonly id: string;

  constructor(id: string, issues: Issue[]) {
    super(issues);
    this.name = "MalformedSetError";
    this.id = id;
  }
}

/**
 * Raised when the wire answers with a failure status. Carries the `url` and
 * `status` of the failed request. A 404 answering a retrieval is a miss, not
 * this error; a 404 answering a listing is this error — a catalog with no
 * listing route is misconfigured, not empty.
 */
export class FailedRequestError extends Error {
  readonly url: string;

  readonly status: number;

  constructor(url: string, status: number) {
    super(`request to "${url}" failed with status ${status}`);
    this.name = "FailedRequestError";
    this.url = url;
    this.status = status;
  }
}
