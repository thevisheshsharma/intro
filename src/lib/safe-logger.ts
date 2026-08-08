interface SafeRouteLogger {
  debug: (...details: unknown[]) => void
  log: (...details: unknown[]) => void
  warn: (...details: unknown[]) => void
  error: (...details: unknown[]) => void
}

/**
 * Route logger that intentionally discards caller-provided details. Existing
 * integration code often passes usernames, graph counts, or provider errors;
 * none of that data is safe to retain in server logs.
 */
export function createSafeRouteLogger(scope: string): SafeRouteLogger {
  return {
    debug: () => undefined,
    log: () => undefined,
    warn: () => undefined,
    error: () => console.error(`[${scope}] operation failed`),
  }
}
