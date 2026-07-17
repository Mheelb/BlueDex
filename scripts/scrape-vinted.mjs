// Scrape les annonces Vinted pour chaque set de la base, les apparie à une
// carte précise (scripts/lib/matchCard.mjs) et écrit les matches acceptés
// dans public.price_listings (scripts/lib/supabaseAdmin.mjs, clé service_role).
//
// Usage :
//   node scripts/scrape-vinted.mjs                 # tous les sets, écrit en base
//   node scripts/scrape-vinted.mjs --set=br1        # un seul set (itération rapide)
//   node scripts/scrape-vinted.mjs --dry-run        # log les matches, aucune écriture
//
// Exécuté quotidiennement par .github/workflows/scrape-vinted.yml — voir ce
// fichier pour les secrets requis (SUPABASE_SERVICE_ROLE_KEY).
import { launchVintedBrowser, openVintedSession, searchItems, fetchItemDescription } from './lib/vintedClient.mjs'
import { scoreListing, hasGameSignal, isLikelyLot } from './lib/matchCard.mjs'
import { supabaseAdmin } from './lib/supabaseAdmin.mjs'

const MAX_PAGES_PER_SET = 5
const UPSERT_CHUNK_SIZE = 200
const SEARCH_QUERIES = ['blue rising', 'karmine corp tcg', 'blue rising kc', 'bluerising', 'blue rising br1']
const DESCRIPTION_FALLBACK_LIMIT = 25

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const setArg = args.find((arg) => arg.startsWith('--set='))
const onlySetSlug = setArg ? setArg.split('=')[1] : null

function randomDelay(minMs, maxMs) {
  return new Promise((resolve) => setTimeout(resolve, minMs + Math.random() * (maxMs - minMs)))
}

function parisDateString(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(date)
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

function buildSnapshotRows(rows, snapshotDate) {
  const byCard = new Map()
  for (const row of rows) {
    const list = byCard.get(row.card_id) ?? []
    list.push(row)
    byCard.set(row.card_id, list)
  }

  const snapshots = []
  for (const [cardId, list] of byCard) {
    const prices = list.map((r) => r.price_amount)
    snapshots.push({
      card_id: cardId,
      snapshot_date: snapshotDate,
      median_price: Number(median(prices).toFixed(2)),
      min_price: Math.min(...prices),
      max_price: Math.max(...prices),
      listing_count: list.length,
      currency: list[0].price_currency,
    })
  }
  return snapshots
}

function toPriceListingRow(item, card, score) {
  return {
    card_id: card.id,
    source: 'vinted',
    external_id: String(item.id),
    title: item.title,
    price_amount: Number.parseFloat(item.price?.amount ?? '0'),
    price_currency: item.price?.currency_code ?? 'EUR',
    listing_url: item.url,
    photo_url: item.photos?.[0]?.url ?? null,
    match_confidence: Number(score.toFixed(3)),
  }
}

function logMatch(prefix, item, result) {
  console.log(
    `  MATCH${prefix} score=${result.score.toFixed(2)} signal=${result.signal.padEnd(6)} "${item.title}" -> ${result.card.name} (#${result.card.number}) — ${item.price?.amount}${item.price?.currency_code}`,
  )
}

async function upsertRows(rows) {
  for (let i = 0; i < rows.length; i += UPSERT_CHUNK_SIZE) {
    const chunk = rows.slice(i, i + UPSERT_CHUNK_SIZE)
    const { error } = await supabaseAdmin.from('price_listings').upsert(chunk, { onConflict: 'source,external_id' })
    if (error) throw new Error(`Upsert failed: ${error.message}`)
  }
}

async function upsertSnapshots(snapshots) {
  const { error } = await supabaseAdmin
    .from('price_daily_snapshots')
    .upsert(snapshots, { onConflict: 'card_id,snapshot_date' })
  if (error) throw new Error(`Snapshot upsert failed: ${error.message}`)
}

async function fetchAllListings(page, set) {
  const seenIds = new Set()
  const items = []
  for (const query of SEARCH_QUERIES) {
    console.log(`[${set.slug}] searching Vinted for "${query}"...`)
    const results = await searchItems(page, query, { maxPages: MAX_PAGES_PER_SET })
    let added = 0
    for (const item of results) {
      if (seenIds.has(item.id)) continue
      seenIds.add(item.id)
      items.push(item)
      added++
    }
    console.log(`[${set.slug}] "${query}": ${results.length} listings, ${added} new`)
    await randomDelay(3000, 6000)
  }
  return items
}

async function processSet(session, set, cards, snapshotDate) {
  const items = await fetchAllListings(session.page, set)
  console.log(`[${set.slug}] fetched ${items.length} listings total across ${SEARCH_QUERIES.length} queries`)

  const rows = []
  const unresolved = []

  for (const item of items) {
    const result = scoreListing(item.title, cards, set.slug)
    if (result) {
      rows.push(toPriceListingRow(item, result.card, result.score))
      if (dryRun) logMatch('', item, result)
      continue
    }
    if (hasGameSignal(item.title, set.slug) && !isLikelyLot(item.title)) {
      unresolved.push(item)
    }
  }

  console.log(
    `[${set.slug}] ${rows.length}/${items.length} matched on title alone, ${unresolved.length} plausible but unresolved`,
  )

  const toRetry = unresolved.slice(0, DESCRIPTION_FALLBACK_LIMIT)
  let recovered = 0
  for (const item of toRetry) {
    const description = await fetchItemDescription(session.page, item.url)
    if (description) {
      const result = scoreListing(`${item.title} ${description}`, cards, set.slug)
      if (result) {
        rows.push(toPriceListingRow(item, result.card, result.score))
        recovered++
        if (dryRun) logMatch(' (desc)', item, result)
      }
    }
    await randomDelay(1500, 3000)
  }
  if (toRetry.length > 0) {
    console.log(`[${set.slug}] description fallback: ${recovered}/${toRetry.length} additional matches`)
  }

  console.log(`[${set.slug}] ${rows.length}/${items.length} listings matched total`)

  if (!dryRun && rows.length > 0) {
    await upsertRows(rows)
    const snapshots = buildSnapshotRows(rows, snapshotDate)
    await upsertSnapshots(snapshots)
    console.log(
      `[${set.slug}] wrote ${rows.length} rows to price_listings and ${snapshots.length} daily snapshots (${snapshotDate})`,
    )
  }
}

async function main() {
  let setsQuery = supabaseAdmin.from('sets').select('*')
  if (onlySetSlug) setsQuery = setsQuery.eq('slug', onlySetSlug)
  const { data: sets, error: setsError } = await setsQuery
  if (setsError) throw new Error(`Failed to load sets: ${setsError.message}`)
  if (!sets || sets.length === 0) throw new Error(`No sets found${onlySetSlug ? ` for slug "${onlySetSlug}"` : ''}`)

  const snapshotDate = parisDateString()
  const browser = await launchVintedBrowser()
  try {
    for (const set of sets) {
      try {
        const { data: cards, error: cardsError } = await supabaseAdmin.from('cards').select('*').eq('set_id', set.id)
        if (cardsError) throw new Error(`Failed to load cards: ${cardsError.message}`)

        const session = await openVintedSession(browser)
        try {
          await processSet(session, set, cards ?? [], snapshotDate)
        } finally {
          await session.close()
        }
      } catch (err) {
        console.error(`[${set.slug}] failed:`, err.message)
      }

      if (sets.length > 1) await randomDelay(4000, 8000)
    }
  } finally {
    await browser.close()
  }
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
