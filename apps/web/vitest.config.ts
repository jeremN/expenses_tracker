import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    include: ['src/**/*.test.ts'],
    // The `cloudflare:workers` module is provided by the Workers runtime
    // and is not resolvable under Node/vitest. Tests stub `env` to empty;
    // call sites that actually exercise the binding mock at a higher level
    // (e.g., `vi.mock('~/server/db')`).
    alias: {
      'cloudflare:workers': new URL('./src/test/cloudflare-workers-stub.ts', import.meta.url).pathname,
    },
  },
})
