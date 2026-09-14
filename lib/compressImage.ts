const MAX_DIMENSION = 1200
const JPEG_QUALITY = 0.7

/**
 * Resizes to at most 1200px on the longest side and re-encodes as JPEG at
 * 70% quality via a canvas. Phone photos land 3-5MB, well over the 1MB
 * Server Action body limit; this gets a typical 4MB photo down to roughly
 * 200KB while staying readable for work evidence. Browser-only — call it
 * from client components, never from a Server Action.
 */
export async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) return file

  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height))
    const width = Math.round(bitmap.width * scale)
    const height = Math.round(bitmap.height * scale)

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return file

    ctx.drawImage(bitmap, 0, 0, width, height)
    bitmap.close()

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY)
    )
    if (!blob) return file

    const name = file.name.replace(/\.\w+$/, '') + '.jpg'
    return new File([blob], name, { type: 'image/jpeg' })
  } catch {
    // Compression is a nice-to-have, not a gate — if the browser can't
    // decode this particular file, submit the original rather than block.
    return file
  }
}
