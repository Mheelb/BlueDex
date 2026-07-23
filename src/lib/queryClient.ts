import { QueryClient } from '@tanstack/vue-query'
import { cardKeys } from '@/queries/cards'
import { setKeys } from '@/queries/sets'
import { articleKeys } from '@/queries/articles'
import { priceKeys } from '@/queries/prices'
import { collectionKeys } from '@/queries/collection'
import { profileKeys } from '@/queries/profile'

const HOUR = 60 * 60_000

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

queryClient.setQueryDefaults(cardKeys.all, { staleTime: HOUR, gcTime: HOUR })
queryClient.setQueryDefaults(setKeys.all, { staleTime: HOUR, gcTime: HOUR })
queryClient.setQueryDefaults(articleKeys.all, { staleTime: HOUR, gcTime: HOUR })
queryClient.setQueryDefaults(priceKeys.all, { staleTime: HOUR, gcTime: HOUR })
queryClient.setQueryDefaults(collectionKeys.all, { staleTime: 5 * 60_000 })
queryClient.setQueryDefaults(profileKeys.all, { staleTime: 5 * 60_000 })
