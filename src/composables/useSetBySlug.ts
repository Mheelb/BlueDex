import type { MaybeRefOrGetter } from 'vue'
import { computed, toValue } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { fetchSetBySlug, setKeys } from '@/queries/sets'

export function useSetBySlug(slug: MaybeRefOrGetter<string>) {
  return useQuery({
    queryKey: computed(() => setKeys.detail(toValue(slug))),
    queryFn: () => fetchSetBySlug(toValue(slug)),
  })
}
