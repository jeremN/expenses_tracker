// Ambient declarations for the Cloudflare Workers runtime bindings used
// by this app. The `cloudflare:workers` module is provided at runtime by
// Workers + `@cloudflare/vite-plugin`. We declare only what we use here
// rather than depending on `@cloudflare/workers-types` directly.
declare module 'cloudflare:workers' {
  // Drizzle's d1 adapter takes its own D1Database type; we widen here to
  // `any` so the binding is assignable to it without pulling in the full
  // Workers types package.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const env: {
    expenses_tracker_db: any
    CF_ACCESS_TEAM_DOMAIN?: string
    CF_ACCESS_AUD?: string
    /** Dev-only. Set in `.dev.vars` to bypass JWT verification. */
    CF_ACCESS_DEV_USER_EMAIL?: string
  }
}
