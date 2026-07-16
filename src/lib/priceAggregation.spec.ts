import { describe, expect, it } from 'vitest'
import { aggregateWeeklyMedian } from '@/lib/priceAggregation'
import type { PriceListing } from '@/types/price'

function makeListing(overrides: Partial<PriceListing>): PriceListing {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    card_id: 'card-1',
    source: 'vinted',
    external_id: '1',
    title: 'Blue Rising BR1.014 Inoxtag',
    price_amount: 10,
    price_currency: 'EUR',
    listing_url: 'https://www.vinted.fr/items/1',
    photo_url: null,
    match_confidence: 0.9,
    scraped_at: '2026-01-05T10:00:00.000Z',
    created_at: '2026-01-05T10:00:00.000Z',
    ...overrides,
  }
}

describe('aggregateWeeklyMedian', () => {
  it('returns an empty array for no listings', () => {
    expect(aggregateWeeklyMedian([])).toEqual([])
  })

  it('groups listings into the same ISO week bucket', () => {
    const listings = [
      makeListing({ price_amount: 10, scraped_at: '2026-01-05T10:00:00.000Z' }), // Monday
      makeListing({ price_amount: 20, scraped_at: '2026-01-08T10:00:00.000Z' }), // Thursday, same week
    ]
    const result = aggregateWeeklyMedian(listings)
    expect(result).toHaveLength(1)
    expect(result[0].weekStart).toBe('2026-01-05')
    expect(result[0].count).toBe(2)
    expect(result[0].median).toBe(15)
  })

  it('splits listings from different weeks into separate buckets, sorted chronologically', () => {
    const listings = [
      makeListing({ price_amount: 30, scraped_at: '2026-01-12T10:00:00.000Z' }),
      makeListing({ price_amount: 10, scraped_at: '2026-01-05T10:00:00.000Z' }),
    ]
    const result = aggregateWeeklyMedian(listings)
    expect(result.map((r) => r.weekStart)).toEqual(['2026-01-05', '2026-01-12'])
  })

  it('computes the median correctly for an odd number of listings', () => {
    const listings = [
      makeListing({ price_amount: 5, scraped_at: '2026-01-05T10:00:00.000Z' }),
      makeListing({ price_amount: 15, scraped_at: '2026-01-06T10:00:00.000Z' }),
      makeListing({ price_amount: 100, scraped_at: '2026-01-07T10:00:00.000Z' }),
    ]
    const result = aggregateWeeklyMedian(listings)
    expect(result[0].median).toBe(15)
  })
})
