export function cdnImage(url: string | null | undefined, width?: number): string | undefined {
  if (!url) return undefined
  if (!/^https?:\/\//.test(url)) return url
  if (import.meta.env.DEV) return url

  const params = new URLSearchParams({ url })
  if (width) params.set('w', String(width))
  return `/.netlify/images?${params.toString()}`
}
