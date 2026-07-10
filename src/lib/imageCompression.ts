const DEFAULT_QUALITY = 0.6

export async function convertImageToWebP(file: File, quality = DEFAULT_QUALITY): Promise<File> {
  if (file.type === 'image/gif') return file

  try {
    const bitmap = await createImageBitmap(file)
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height

    const ctx = canvas.getContext('2d')
    if (!ctx) return file

    ctx.drawImage(bitmap, 0, 0)
    bitmap.close()

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', quality))
    // Re-encoding can lose (e.g. a source already smaller/lossless) — keep whichever is smaller.
    if (!blob || blob.size >= file.size) return file

    const webpName = file.name.replace(/\.[^.]+$/, '') + '.webp'
    return new File([blob], webpName, { type: 'image/webp' })
  } catch {
    return file
  }
}
