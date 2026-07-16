import type { PriceListing } from '@/types/price'

export interface WeeklyPricePoint {
  weekStart: string
  median: number
  count: number
}

function getIsoWeekStart(dateStr: string): string {
  const date = new Date(dateStr)
  const dayIndex = (date.getUTCDay() + 6) % 7 // 0 = lundi
  const monday = new Date(date)
  monday.setUTCDate(date.getUTCDate() - dayIndex)
  monday.setUTCHours(0, 0, 0, 0)
  return monday.toISOString().slice(0, 10)
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

export function aggregateWeeklyMedian(listings: PriceListing[]): WeeklyPricePoint[] {
  const buckets = new Map<string, number[]>()
  for (const listing of listings) {
    const weekStart = getIsoWeekStart(listing.scraped_at)
    const prices = buckets.get(weekStart) ?? []
    prices.push(listing.price_amount)
    buckets.set(weekStart, prices)
  }

  return [...buckets.entries()]
    .map(([weekStart, prices]) => ({ weekStart, median: median(prices), count: prices.length }))
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart))
}
