import reactHooks from 'eslint-plugin-react-hooks'
import tsParser from '@typescript-eslint/parser'
import tsPlugin from '@typescript-eslint/eslint-plugin'

export default [
  {
    // Suppress unused-disable-directive noise from generated files.
    linterOptions: { reportUnusedDisableDirectives: 'warn' },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: { ecmaFeatures: { jsx: true }, sourceType: 'module' },
    },
    plugins: {
      'react-hooks': reactHooks,
      // Register @typescript-eslint so existing `eslint-disable-next-line
      // @typescript-eslint/no-explicit-any` comments are recognised and don't
      // produce "Definition for rule not found" errors. We only turn off the
      // rule — we don't enable any other TS-specific rules here.
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
]
