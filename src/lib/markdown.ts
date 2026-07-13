import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { CARD_SYMBOLS } from '@/lib/cardSymbols'

const SYMBOL_PATTERN = /:([a-z0-9_-]+):/gi

// La page article affiche déjà le titre en <h1>. Si le contenu markdown
// contient un H1 (ancien contenu, ou modèle qui répète le titre), on le dégrade
// en <h2> pour ne pas avoir deux H1 sur la page (anti-pattern SEO).
function demoteHeadings(html: string): string {
  return html.replace(/<(\/?)h1(\s[^>]*)?>/gi, '<$1h2$2>')
}

function replaceCardSymbols(html: string): string {
  return html.replace(SYMBOL_PATTERN, (match, key: string) => {
    const src = CARD_SYMBOLS[key.toLowerCase()]
    if (!src) return match
    return `<img src="${src}" alt="${key}" class="inline-block h-5 w-5 -translate-y-0.5 align-middle" />`
  })
}

export function renderMarkdown(source: string): string {
  const html = marked.parse(source, { async: false }) as string
  return DOMPurify.sanitize(demoteHeadings(replaceCardSymbols(html)))
}
