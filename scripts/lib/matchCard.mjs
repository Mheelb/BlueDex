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

function containsWholeWord(normalizedTitle, phrase) {
  const pattern = new RegExp(`\\b${escapeRegExp(normalize(phrase))}\\b`)
  return pattern.test(normalizedTitle)
}

export function computeRarityBonus(title, card) {
  const normalizedTitle = normalize(title)
  const keywords = [card.rarity]
  if (card.is_holo) keywords.push('holo')
  if (card.is_signed) keywords.push('dedicacee', 'signee')
  if (card.is_numbered) keywords.push('numerotee')
  if (card.is_full_art) keywords.push('full art', 'fullart')

  const hasKeyword = keywords.some((keyword) => containsWholeWord(normalizedTitle, keyword))
  return hasKeyword ? RARITY_BONUS : 0
}

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

  const scored = candidateCards
    .map((card) => ({ card, rawScore: computeNameScore(title, card.name) + computeRarityBonus(title, card) }))
    .sort((a, b) => b.rawScore - a.rawScore)

  const best = scored[0]
  if (!best || best.rawScore < CONFIDENCE_THRESHOLD) return null

  const runnerUp = scored[1]
  if (runnerUp && runnerUp.rawScore === best.rawScore) return null

  return { card: best.card, score: Math.min(1, best.rawScore), signal: 'name' }
}
