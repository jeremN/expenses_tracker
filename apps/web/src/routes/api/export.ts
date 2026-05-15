import { createFileRoute } from '@tanstack/react-router'
import { getDB } from '~/server/db'
import { buildExportZip } from '~/server/export'
import { errorResponse } from '~/server/api-helpers'

export const Route = createFileRoute('/api/export')({
  server: {
    handlers: {
      GET: async () => {
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
          console.error('export failed:', e)
          return errorResponse('Failed to build export', 500)
        }
      },
    },
  },
})
