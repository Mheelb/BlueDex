import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { CARD_SYMBOLS } from '@/lib/cardSymbols'

const SYMBOL_PATTERN = /:([a-z0-9_-]+):/gi

function replaceCardSymbols(html: string): string {
  return html.replace(SYMBOL_PATTERN, (match, key: string) => {
    const src = CARD_SYMBOLS[key.toLowerCase()]
    if (!src) return match
    return `<img src="${src}" alt="${key}" class="inline-block h-5 w-5 -translate-y-0.5 align-middle" />`
  })
}

export function renderMarkdown(source: string): string {
  const html = marked.parse(source, { async: false }) as string
  return DOMPurify.sanitize(replaceCardSymbols(html))
}
