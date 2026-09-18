import 'server-only'

/**
 * Server-side upload guardrails, shared by work-request photos and
 * confirmation proof photos. The client already compresses everything to
 * JPEG before upload (see lib/compressImage.ts), but that's a UI
 * convenience, not enforcement — anyone can call these Server Actions
 * directly with an arbitrary file, so the real checks live here.
 */
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024 // 5MB
export const MAX_PHOTOS_PER_SUBMISSION = 6

export type SniffedImageType = 'image/jpeg' | 'image/png' | 'image/webp'

const JPEG_MAGIC = [0xff, 0xd8, 0xff]
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

/**
 * Identifies the file by its actual leading bytes, not the browser-supplied
 * `file.type` (trivially spoofable) or the filename extension. Only the
 * three types below are ever accepted, regardless of what the client
 * claims.
 */
async function sniffImageType(file: File): Promise<SniffedImageType | null> {
  const head = new Uint8Array(await file.slice(0, 12).arrayBuffer())

  if (JPEG_MAGIC.every((byte, i) => head[i] === byte)) return 'image/jpeg'
  if (PNG_MAGIC.every((byte, i) => head[i] === byte)) return 'image/png'
  if (
    head[0] === 0x52 && head[1] === 0x49 && head[2] === 0x46 && head[3] === 0x46 && // "RIFF"
    head[8] === 0x57 && head[9] === 0x45 && head[10] === 0x42 && head[11] === 0x50 // "WEBP"
  ) {
    return 'image/webp'
  }
  return null
}

export type FileValidationResult =
  | { ok: true; contentType: SniffedImageType }
  | { ok: false; reason: 'empty' | 'too_large' | 'invalid_type' }

export async function validateImageFile(file: File): Promise<FileValidationResult> {
  if (file.size === 0) return { ok: false, reason: 'empty' }
  if (file.size > MAX_FILE_SIZE_BYTES) return { ok: false, reason: 'too_large' }

  const contentType = await sniffImageType(file)
  if (!contentType) return { ok: false, reason: 'invalid_type' }

  return { ok: true, contentType }
}
