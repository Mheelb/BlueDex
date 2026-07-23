export const CARD_SYMBOLS = {
  rotation: '/symbols/rotation.png',
  '0power': '/symbols/0power.svg',
  '1power': '/symbols/1power.svg',
  '0soutien': '/symbols/0soutien.svg',
  '1soutien': '/symbols/1soutien.svg',
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export function escapeAttr(value) {
  return escapeHtml(value).replace(/"/g, '&quot;')
}

export function jsonLdScript(jsonLd) {
  if (!jsonLd) return ''
  const safe = JSON.stringify(jsonLd).replace(/</g, '\\u003c')
  return `<script type="application/ld+json">${safe}</script>`
}

export function urlEntry({ loc, lastmod, changefreq, priority }) {
  const parts = [`    <loc>${loc}</loc>`]
  if (lastmod) parts.push(`    <lastmod>${lastmod}</lastmod>`)
  if (changefreq) parts.push(`    <changefreq>${changefreq}</changefreq>`)
  if (priority) parts.push(`    <priority>${priority}</priority>`)
  return `  <url>\n${parts.join('\n')}\n  </url>`
}
