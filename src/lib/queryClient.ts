import { QueryClient } from '@tanstack/vue-query'
import { cardKeys } from '@/queries/cards'
import { setKeys } from '@/queries/sets'

const CATALOGUE_CACHE = { staleTime: 60 * 60_000, gcTime: 60 * 60_000 }

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

queryClient.setQueryDefaults(cardKeys.all, CATALOGUE_CACHE)
queryClient.setQueryDefaults(setKeys.all, CATALOGUE_CACHE)
