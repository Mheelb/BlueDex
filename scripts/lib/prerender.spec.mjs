import { describe, expect, it } from 'vitest'
import { CARD_SYMBOLS as FRONT_CARD_SYMBOLS } from '@/lib/cardSymbols'
import { CARD_SYMBOLS, escapeAttr, escapeHtml, jsonLdScript, urlEntry } from './prerender.mjs'

describe('escapeHtml', () => {
  it('échappe &, < et >', () => {
    expect(escapeHtml('a & b <c> d')).toBe('a &amp; b &lt;c&gt; d')
  })

  it('échappe & avant < et > (pas de double échappement)', () => {
    expect(escapeHtml('<')).toBe('&lt;')
    expect(escapeHtml('&lt;')).toBe('&amp;lt;')
  })

  it('gère null/undefined', () => {
    expect(escapeHtml(null)).toBe('')
    expect(escapeHtml(undefined)).toBe('')
  })
})

describe('escapeAttr', () => {
  it('échappe aussi les guillemets doubles', () => {
    expect(escapeAttr('x " onmouseover="alert(1)')).toBe('x &quot; onmouseover=&quot;alert(1)')
  })
})

describe('jsonLdScript', () => {
  it('retourne une chaîne vide sans données', () => {
    expect(jsonLdScript(null)).toBe('')
    expect(jsonLdScript(undefined)).toBe('')
  })

  it('neutralise une tentative de fermeture de balise script (XSS)', () => {
    const out = jsonLdScript({ name: '</script><script>alert(1)</script>' })
    expect(out.match(/<\/script>/g)).toHaveLength(1)
    expect(out).toContain('\\u003c')
    expect(out).toContain('<script type="application/ld+json">')
  })

  it('produit du JSON-LD valide une fois déséchappé', () => {
    const out = jsonLdScript({ '@type': 'Article', headline: 'Aile & Feu' })
    const json = out.replace(/^<script[^>]*>/, '').replace(/<\/script>$/, '')
    expect(JSON.parse(json)).toEqual({ '@type': 'Article', headline: 'Aile & Feu' })
  })
})

describe('urlEntry', () => {
  it('inclut uniquement les champs fournis', () => {
    expect(urlEntry({ loc: 'https://x/a' })).toBe('  <url>\n    <loc>https://x/a</loc>\n  </url>')
  })

  it('inclut lastmod, changefreq et priority quand présents', () => {
    const out = urlEntry({ loc: 'https://x/a', lastmod: '2026-01-01', changefreq: 'weekly', priority: '0.7' })
    expect(out).toContain('<lastmod>2026-01-01</lastmod>')
    expect(out).toContain('<changefreq>weekly</changefreq>')
    expect(out).toContain('<priority>0.7</priority>')
  })
})

describe('parité CARD_SYMBOLS front ↔ prerender', () => {
  it('la table de symboles du prerender reste synchro avec src/lib/cardSymbols', () => {
    expect(CARD_SYMBOLS).toEqual(FRONT_CARD_SYMBOLS)
  })
})
