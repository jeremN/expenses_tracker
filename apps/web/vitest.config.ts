import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    // Default to node (fast, matches existing server tests). Component tests
    // opt into the DOM per-file with `// @vitest-environment jsdom`.
    environment: 'node',
    setupFiles: ['./src/test/setup-dom.ts'],
    // The `cloudflare:workers` module is provided by the Workers runtime and
    // is not resolvable under Node/vitest. Tests stub `env` to empty; call
    // sites that exercise the binding mock at a higher level.
    alias: {
      'cloudflare:workers': new URL('./src/test/cloudflare-workers-stub.ts', import.meta.url).pathname,
    },
  },
})
