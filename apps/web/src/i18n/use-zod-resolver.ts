import { zodResolver } from '@hookform/resolvers/zod'
import type { z } from 'zod'
import { useTranslation } from '~/i18n'
import { makeZodErrorMap } from '~/i18n/zod-error-map'

/**
 * Drop-in replacement for `zodResolver(schema)` that injects the
 * locale-bound errorMap so zod-default messages are localized. Explicit
 * per-field messages in the schema still take precedence.
 *
 * Type note: @hookform/resolvers v5 + zod v3.25.76 types the second arg of
 * the zod v3 overload as the full `z.ParseParams` (path + async required).
 * The internal `Zod3ParseParams` uses `InexactPartial<ParseParams>` (all
 * optional), but that type is not exported. Narrower casts such as
 * `Parameters<typeof zodResolver>[1]`, `Pick<z.ParseParams, 'errorMap'>`, or
 * `{ errorMap: z.ZodErrorMap }` all fail TS2769 because the assertion target
 * is not assignable to the overload's parameter type. `as z.ParseParams` is
 * therefore the smallest cast that compiles; only errorMap is consulted at
 * runtime, path/async are ignored.
 */
export function useZodResolver<T extends z.ZodTypeAny>(schema: T) {
  const { t } = useTranslation()
  return zodResolver(schema, { errorMap: makeZodErrorMap(t) } as z.ParseParams)
}
