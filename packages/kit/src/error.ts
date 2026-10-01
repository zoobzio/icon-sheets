/**
 * Raised when there is no config file at the path the build was pointed at.
 * Carries the `path` it looked for.
 */
export class MissingConfigError extends Error {
  readonly path: string;

  constructor(path: string) {
    super(`@icon-sheets/kit: no config file at ${path}`);
    this.name = "MissingConfigError";
    this.path = path;
  }
}

/**
 * Raised when a config file does not default-export a config — the file loaded,
 * but what it exports is not config-shaped. Carries the `path` of the file.
 */
export class MalformedConfigError extends Error {
  readonly path: string;

  constructor(path: string) {
    super(
      `@icon-sheets/kit: ${path} must default-export a config (defineConfig({ id, name, icons }))`,
    );
    this.name = "MalformedConfigError";
    this.path = path;
  }
}

/**
 * Raised when a config breaks the kit's rules — a name outside the allowed
 * charset, a set rebinding an alias the config does not declare, an output
 * directory outside the project root. Carries every issue found, not just the
 * first, and is thrown before any ref is resolved, so a bad config never
 * touches the network.
 */
export class InvalidConfigError extends Error {
  readonly issues: string[];

  constructor(issues: string[]) {
    const lines = issues.map((issue) => `  ${issue}`).join("\n");
    super(`@icon-sheets/kit: the config is invalid —\n${lines}`);
    this.name = "InvalidConfigError";
    this.issues = issues;
  }
}
