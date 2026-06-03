import { zodResolver } from '@hookform/resolvers/zod'
import type { FieldValues } from 'react-hook-form'
import type { z } from 'zod'
import { useTranslation } from '~/i18n'
import { makeZodErrorMap } from '~/i18n/zod-error-map'

/**
 * Drop-in replacement for `zodResolver(schema)` that injects the
 * locale-bound error map so zod-default messages are localized. Explicit
 * per-field messages in the schema still take precedence.
 *
 * zod v4 note: error customization moved from the v3 `{ errorMap }` parse
 * param to `{ error }`. `@hookform/resolvers` v5 forwards it straight to the
 * zod-v4 resolver overload, so unlike the v3 code this needs no cast — but the
 * generics must mirror that overload (schema input constrained to
 * `FieldValues`) or inference falls back to `Resolver<FieldValues, …>` and
 * every consuming form fails to typecheck.
 */
export function useZodResolver<TOutput, TInput extends FieldValues>(
  schema: z.ZodType<TOutput, TInput>,
) {
  const { t } = useTranslation()
  return zodResolver(schema, { error: makeZodErrorMap(t) })
}
