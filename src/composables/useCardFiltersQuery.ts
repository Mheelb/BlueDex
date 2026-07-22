import { computed } from 'vue'
import type { WritableComputedRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { LocationQuery } from 'vue-router'
import type { CardFilters } from '@/types/card'
import { FILTER_QUERY_KEYS, filtersToQuery, firstString, queryToFilters } from '@/lib/filtersQuery'

export interface UseCardFiltersQueryOptions {
  flags?: readonly string[]
}

export interface UseCardFiltersQueryResult {
  filters: WritableComputedRef<CardFilters>
  flags: Record<string, boolean>
}

export function useCardFiltersQuery(options: UseCardFiltersQueryOptions = {}): UseCardFiltersQueryResult {
  const flagKeys = options.flags ?? []
  const managedKeys = new Set<string>([...FILTER_QUERY_KEYS, ...flagKeys])
  const route = useRoute()
  const router = useRouter()

  function write(managed: Record<string, string>) {
    const next: LocationQuery = {}
    for (const [key, value] of Object.entries(route.query)) {
      if (!managedKeys.has(key)) next[key] = value
    }
    Object.assign(next, managed)
    router.replace({ query: next }).catch(() => {})
  }

  function activeFlagParams(overrideKey?: string, overrideValue?: boolean): Record<string, string> {
    const params: Record<string, string> = {}
    for (const key of flagKeys) {
      const active = key === overrideKey ? overrideValue : firstString(route.query[key]) === '1'
      if (active) params[key] = '1'
    }
    return params
  }

  const filters = computed<CardFilters>({
    get: () => queryToFilters(route.query),
    set: (value) => write({ ...filtersToQuery(value), ...activeFlagParams() }),
  })

  const flags = {} as Record<string, boolean>
  for (const key of flagKeys) {
    Object.defineProperty(flags, key, {
      enumerable: true,
      get: () => firstString(route.query[key]) === '1',
      set: (value: boolean) => write({ ...filtersToQuery(filters.value), ...activeFlagParams(key, value) }),
    })
  }

  return { filters, flags }
}
