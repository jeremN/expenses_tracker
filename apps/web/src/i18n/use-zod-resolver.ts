import { zodResolver } from '@hookform/resolvers/zod'
import type { z } from 'zod'
import { useTranslation } from '~/i18n'
import { makeZodErrorMap } from '~/i18n/zod-error-map'

/**
 * Drop-in replacement for `zodResolver(schema)` that injects the
 * locale-bound errorMap so zod-default messages are localized. Explicit
 * per-field messages in the schema still take precedence.
 *
 * Type note: @hookform/resolvers v5 maps zod v3 schemaOptions to the full
 * z.ParseParams type (path + async required at the type level), but at
 * runtime only errorMap is consulted. We cast to satisfy TS while keeping
 * identical runtime behavior.
 */
export function useZodResolver<T extends z.ZodTypeAny>(schema: T) {
  const { t } = useTranslation()
  return zodResolver(schema, { errorMap: makeZodErrorMap(t) } as z.ParseParams)
}
