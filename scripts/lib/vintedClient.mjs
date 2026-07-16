// Orchestration Playwright pour interroger Vinted. Vinted (Cloudflare +
// Datadome) bloque les requêtes HTTP nues et les cookies de session rejoués
// hors navigateur (validé manuellement) — chaque recherche doit donc passer
// par un vrai navigateur headless, page par page, via un fetch() exécuté
// depuis le contexte de la page elle-même.
//
// Séparé de matchCard.mjs à dessein : cette partie a une dépendance dure à
// Playwright, l'algorithme de matching n'en a aucune et reste testable seul.
import { chromium } from 'playwright'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
const CHALLENGE_WAIT_MS = 8000
const ITEM_PAGE_WAIT_MS = 3000
const PER_PAGE = 96

export async function launchVintedBrowser() {
  return chromium.launch({ headless: true })
}

function randomDelay(minMs, maxMs) {
  return new Promise((resolve) => setTimeout(resolve, minMs + Math.random() * (maxMs - minMs)))
}

export async function openVintedSession(browser) {
  const context = await browser.newContext({ userAgent: USER_AGENT, locale: 'fr-FR' })
  const page = await context.newPage()

  await page.goto('https://www.vinted.fr/catalog?search_text=blue+rising', {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  })
  await page.waitForTimeout(CHALLENGE_WAIT_MS)

  return { page, close: () => context.close() }
}

export async function searchItems(page, query, { maxPages = 3 } = {}) {
  const seenIds = new Set()
  const items = []

  for (let pageNumber = 1; pageNumber <= maxPages; pageNumber++) {
    const result = await page.evaluate(
      async ({ query, pageNumber, perPage }) => {
        const res = await fetch(
          `/api/v2/catalog/items?search_text=${encodeURIComponent(query)}&page=${pageNumber}&per_page=${perPage}`,
          { headers: { Accept: 'application/json' } },
        )
        if (!res.ok) return { ok: false, status: res.status, items: [] }
        const json = await res.json()
        return { ok: true, status: res.status, items: json.items ?? [] }
      },
      { query, pageNumber, perPage: PER_PAGE },
    )

    if (!result.ok) {
      console.warn(`[vinted] page ${pageNumber} for "${query}" failed with status ${result.status}`)
      break
    }

    for (const item of result.items) {
      if (seenIds.has(item.id)) continue
      seenIds.add(item.id)
      items.push(item)
    }
    if (result.items.length < PER_PAGE) break // dernière page

    await randomDelay(2000, 4000)
  }

  return items
}

export async function fetchItemDescription(page, url) {
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 })
    await page.waitForTimeout(ITEM_PAGE_WAIT_MS)
    return await page.evaluate(
      () => document.querySelector('meta[property="og:description"]')?.getAttribute('content') ?? null,
    )
  } catch (err) {
    console.warn(`[vinted] failed to fetch description for ${url}:`, err.message)
    return null
  }
}
