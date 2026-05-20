import { createFileRoute } from '@tanstack/react-router'
import { AppError } from '@tracker/shared'
import { getDB } from '~/server/db'
import { buildExportZip } from '~/server/export'
import { withAuthApiHandler } from '~/server/logger'

export const Route = createFileRoute('/api/export')({
  server: {
    handlers: {
      GET: withAuthApiHandler('api:GET /api/export', async () => {
        try {
          const db = getDB()
          const bytes = await buildExportZip(db)
          // Date in filename uses UTC; Cloudflare Workers don't have a
          // configurable TZ and the user can rename the file post-download.
          const dateStr = new Date().toISOString().slice(0, 10)
          // The Uint8Array returned by JSZip has an ArrayBufferLike backing
          // store (lib.dom narrows BodyInit to Uint8Array<ArrayBuffer>),
          // so cast to BodyInit. The runtime accepts it just fine.
          return new Response(bytes as unknown as BodyInit, {
            status: 200,
            headers: {
              'Content-Type': 'application/zip',
              'Content-Disposition': `attachment; filename="expenses-tracker-backup-${dateStr}.zip"`,
              'Content-Length': String(bytes.byteLength),
            },
          })
        } catch (e) {
          // Re-throw as the specific code so the wrapper preserves the
          // EXPORT_FAILED contract (logger picks up the message text).
          if (e instanceof AppError) throw e
          throw new AppError(
            'EXPORT_FAILED',
            e instanceof Error ? `Export failed: ${e.message}` : 'Failed to build export',
          )
        }
      }),
    },
  },
})
