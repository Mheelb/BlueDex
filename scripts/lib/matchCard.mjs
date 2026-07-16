// Appariement d'une annonce Vinted (titre libre) à une carte précise de la
// base BlueDex. Fonctions pures, zéro dépendance externe — testées sans
// navigateur ni accès réseau dans matchCard.spec.mjs.
//
// Constantes de scoring exportées pour rester ajustables sans toucher à la
// logique : à recalibrer pendant le dry-run (scripts/scrape-vinted.mjs --dry-run)
// une fois de vraies annonces sous les yeux.
export const CONFIDENCE_THRESHOLD = 0.7
export const NUMBER_MATCH_BASE_SCORE = 0.9
export const RARITY_BONUS = 0.05
export const NAME_SCORE_MATCHED_RATIO_WEIGHT = 0.7
export const NAME_SCORE_AVG_SIMILARITY_WEIGHT = 0.3
export const NAME_TOKEN_MATCH_THRESHOLD = 0.6

const LOT_PATTERNS = [
  /\blots?\b/i,
  /\bbundle\b/i,
  /\bplayset\b/i,
  /\bdestockage\b/i,
  /\ben\s*vrac\b/i,
  /\bx\s?\d{2,}\b/i,
  /\b\d{2,}\s*cartes\b/i,
]

const STOPWORDS = new Set([
  'carte',
  'cartes',
  'blue',
  'rising',
  'neuf',
  'neuve',
  'occasion',
  'vinted',
  'tbe',
  'bon',
  'etat',
  'kc',
])

// Vocabulaire français observé sur de vraies annonces (pas d'abréviations
// anglaises type SR/SEC — les vendeurs de ce jeu écrivent les mots en toutes
// lettres, cf. "Cartes communes Blue Rising").
const RARITY_KEYWORDS = {
  Commune: ['commune'],
  'Peu commune': ['peu commune'],
  Rare: ['rare'],
  'Prestige I': ['prestige'],
  'Prestige II': ['prestige'],
  'Prestige III': ['prestige'],
  Mythique: ['mythique'],
}

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function normalize(str) {
  return str
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokenize(str) {
  return normalize(str)
    .split(' ')
    .filter((token) => token.length > 0 && !STOPWORDS.has(token))
}

export function isLikelyLot(title) {
  return LOT_PATTERNS.some((pattern) => pattern.test(title))
}

export function hasGameSignal(title, setSlug) {
  if (/blue\s*rising/i.test(title)) return true
  const slugPattern = new RegExp(`\\b${escapeRegExp(setSlug)}\\b`, 'i')
  return slugPattern.test(title)
}

// Retourne les numéros normalisés (zéros de tête retirés) trouvés dans le
// titre, ex. "BR1.014" / "BR1 014" / "BR1-014" -> ["14"].
export function extractCardNumbers(title, setSlug) {
  const pattern = new RegExp(`\\b${escapeRegExp(setSlug)}[\\s.\\-]{0,3}(\\d{1,3})\\b`, 'gi')
  const found = new Set()
  let match
  while ((match = pattern.exec(title)) !== null) {
    found.add(String(parseInt(match[1], 10)))
  }
  return [...found]
}

function bigrams(str) {
  if (str.length < 2) return [str]
  const result = []
  for (let i = 0; i < str.length - 1; i++) {
    result.push(str.slice(i, i + 2))
  }
  return result
}

// Coefficient de Dice sur bigrammes de caractères — tolère fautes de frappe
// et légères variations sans dépendance de fuzzy-matching externe.
export function diceCoefficient(a, b) {
  if (a === b) return 1
  if (a.length < 2 || b.length < 2) return 0

  const bigramsA = bigrams(a)
  const bigramsB = bigrams(b)
  const counts = new Map()
  for (const bg of bigramsA) counts.set(bg, (counts.get(bg) ?? 0) + 1)

  let intersection = 0
  for (const bg of bigramsB) {
    const remaining = counts.get(bg) ?? 0
    if (remaining > 0) {
      intersection++
      counts.set(bg, remaining - 1)
    }
  }

  return (2 * intersection) / (bigramsA.length + bigramsB.length)
}

export function computeNameScore(title, cardName) {
  const titleTokens = tokenize(title)
  const nameTokens = tokenize(cardName)
  if (nameTokens.length === 0 || titleTokens.length === 0) return 0

  const perTokenBest = nameTokens.map((nameToken) =>
    Math.max(...titleTokens.map((titleToken) => diceCoefficient(nameToken, titleToken))),
  )
  const matchedRatio = perTokenBest.filter((score) => score >= NAME_TOKEN_MATCH_THRESHOLD).length / nameTokens.length
  const avgSimilarity = perTokenBest.reduce((sum, score) => sum + score, 0) / perTokenBest.length

  return NAME_SCORE_MATCHED_RATIO_WEIGHT * matchedRatio + NAME_SCORE_AVG_SIMILARITY_WEIGHT * avgSimilarity
}

export function computeRarityBonus(title, card) {
  const normalizedTitle = normalize(title)
  const keywords = [...(RARITY_KEYWORDS[card.rarity] ?? [])]
  if (card.is_holo) keywords.push('holo')
  if (card.is_signed) keywords.push('dedicacee', 'signee')
  if (card.is_numbered) keywords.push('numerotee')
  if (card.is_full_art) keywords.push('full art', 'fullart')

  const hasKeyword = keywords.some((keyword) => normalizedTitle.includes(normalize(keyword)))
  return hasKeyword ? RARITY_BONUS : 0
}

// candidateCards : toutes les cartes du set ciblé par la recherche.
// Retourne { card, score, signal } si un match est accepté, sinon null.
export function scoreListing(title, candidateCards, setSlug) {
  if (isLikelyLot(title)) return null
  if (!hasGameSignal(title, setSlug)) return null

  const numbers = extractCardNumbers(title, setSlug)
  if (numbers.length === 1) {
    const card = candidateCards.find((c) => String(parseInt(c.number, 10)) === numbers[0])
    if (!card) return null
    const bonus = computeRarityBonus(title, card)
    return { card, score: Math.min(1, NUMBER_MATCH_BASE_SCORE + bonus), signal: 'number' }
  }
  if (numbers.length > 1) return null // plusieurs numéros = annonce multi-cartes, ambigu

  let best = null
  for (const card of candidateCards) {
    const nameScore = computeNameScore(title, card.name)
    if (best === null || nameScore > best.nameScore) {
      best = { card, nameScore }
    }
  }
  if (best === null) return null

  const bonus = computeRarityBonus(title, best.card)
  const finalScore = Math.min(1, best.nameScore + bonus)
  if (finalScore < CONFIDENCE_THRESHOLD) return null

  return { card: best.card, score: finalScore, signal: 'name' }
}
