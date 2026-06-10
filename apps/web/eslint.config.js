import reactHooks from 'eslint-plugin-react-hooks'
import tsParser from '@typescript-eslint/parser'
import tsPlugin from '@typescript-eslint/eslint-plugin'

// Minimal, focused config: enforce the Rules of Hooks (and flag stale effect
// deps). Nothing else — the repo isn't broadly linted, and a noisy ruleset
// would just get ignored.
export default [
  // Generated file carries a blanket /* eslint-disable */; don't lint it.
  { ignores: ['src/routeTree.gen.ts'] },
  {
    files: ['src/**/*.{ts,tsx}'],
    // Don't report the pre-existing `eslint-disable @typescript-eslint/*`
    // directives as unused — the rule is registered-but-off below purely so
    // those directives resolve (ESLint 9 errors on a disable for an unknown
    // rule). We enforce only react-hooks.
    linterOptions: { reportUnusedDisableDirectives: 'off' },
    languageOptions: {
      parser: tsParser,
      parserOptions: { ecmaFeatures: { jsx: true }, sourceType: 'module' },
    },
    plugins: { 'react-hooks': reactHooks, '@typescript-eslint': tsPlugin },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
]
