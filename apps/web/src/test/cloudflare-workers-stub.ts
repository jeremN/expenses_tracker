// Vitest stub for the `cloudflare:workers` runtime module. Real bindings
// only exist inside the Workers runtime; under Node we expose an empty
// env so module-load doesn't crash. Tests that need binding behavior
// mock the higher-level module (e.g. `~/server/db`, `~/server/access`).
export const env = {} as Record<string, unknown>
