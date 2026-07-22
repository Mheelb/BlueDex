import type { LocationQuery, LocationQueryValue } from 'vue-router'
import type { CardFilters, CardSort } from '@/types/card'
import {
  CARD_SORTS,
  CARD_TYPES,
  COST_RANGE,
  createEmptyCardFilters,
  FACTIONS,
  POWER_RANGE,
  RARITIES,
  SUBTYPES,
  SUPPORT_RANGE,
} from '@/types/card'

type QueryValue = LocationQueryValue | LocationQueryValue[] | undefined

interface Codec<T> {
  serialize: (value: T) => string | undefined
  deserialize: (raw: string) => T
}

export function firstString(value: QueryValue): string {
  if (Array.isArray(value)) return typeof value[0] === 'string' ? value[0] : ''
  return typeof value === 'string' ? value : ''
}

function dedupe<T>(list: T[]): T[] {
  return [...new Set(list)]
}

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, '-')
}

function enumCodec<T extends string>(values: readonly T[]): Codec<T[]> {
  const toSlug = new Map<T, string>()
  const fromSlug = new Map<string, T>()
  for (const value of values) {
    const slug = slugify(value)
    toSlug.set(value, slug)
    fromSlug.set(slug, value)
  }
  return {
    serialize: (list) => (list.length ? list.map((v) => toSlug.get(v)).join(',') : undefined),
    deserialize: (raw) =>
      dedupe(
        raw
          .split(',')
          .map((token) => fromSlug.get(token.trim().toLowerCase()))
          .filter((value): value is T => value !== undefined),
      ),
  }
}

function rangeCodec(full: readonly [number, number]): Codec<[number, number]> {
  const clamp = (n: number) => Math.min(Math.max(n, full[0]), full[1])
  return {
    serialize: ([min, max]) => (min <= full[0] && max >= full[1] ? undefined : `${min}-${max}`),
    deserialize: (raw) => {
      const match = raw.match(/^(\d+)-(\d+)$/)
      if (!match) return [full[0], full[1]]
      let [min, max] = [Number(match[1]), Number(match[2])]
      if (min > max) [min, max] = [max, min]
      return [clamp(min), clamp(max)]
    },
  }
}

const textCodec: Codec<string> = {
  serialize: (value) => value.trim() || undefined,
  deserialize: (value) => value,
}

const listCodec: Codec<string[]> = {
  serialize: (list) => (list.length ? list.join(',') : undefined),
  deserialize: (raw) =>
    dedupe(
      raw
        .split(',')
        .map((token) => token.trim())
        .filter(Boolean),
    ),
}

const sortCodec: Codec<CardSort> = {
  serialize: (value) => (value === 'number-asc' ? undefined : value),
  deserialize: (raw) => ((CARD_SORTS as readonly string[]).includes(raw) ? (raw as CardSort) : 'number-asc'),
}

interface FilterField {
  key: string
  read: (filters: CardFilters) => string | undefined
  write: (filters: CardFilters, raw: string) => void
}

function field<K extends keyof CardFilters>(key: string, prop: K, codec: Codec<CardFilters[K]>): FilterField {
  return {
    key,
    read: (filters) => codec.serialize(filters[prop]),
    write: (filters, raw) => {
      filters[prop] = codec.deserialize(raw)
    },
  }
}

const FIELDS: FilterField[] = [
  field('q', 'search', textCodec),
  field('rarity', 'rarity', enumCodec(RARITIES)),
  field('type', 'type', enumCodec(CARD_TYPES)),
  field('subtype', 'subtype', enumCodec(SUBTYPES)),
  field('faction', 'faction', enumCodec(FACTIONS)),
  field('artist', 'artist', listCodec),
  field('sort', 'sort', sortCodec),
  field('cost', 'costRange', rangeCodec(COST_RANGE)),
  field('power', 'powerRange', rangeCodec(POWER_RANGE)),
  field('support', 'supportRange', rangeCodec(SUPPORT_RANGE)),
]

export const FILTER_QUERY_KEYS = FIELDS.map((f) => f.key)

export function filtersToQuery(filters: CardFilters): Record<string, string> {
  const query: Record<string, string> = {}
  for (const { key, read } of FIELDS) {
    const value = read(filters)
    if (value !== undefined) query[key] = value
  }
  return query
}

export function queryToFilters(query: LocationQuery): CardFilters {
  const filters = createEmptyCardFilters()
  for (const { key, write } of FIELDS) {
    const raw = firstString(query[key])
    if (raw) write(filters, raw)
  }
  return filters
}
