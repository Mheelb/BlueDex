import { computed } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { toast } from 'vue-sonner'
import { useAuthUser } from '@/composables/useAuthUser'
import { collectionKeys, fetchMyCollection, setCollectionQuantity } from '@/queries/collection'
import { toUserMessage } from '@/lib/errorMessage'

export function useMyCollection() {
  const { session } = useAuthUser()
  const userId = computed(() => session.value?.user.id)
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery({
    queryKey: computed(() => collectionKeys.mine(userId.value ?? '')),
    queryFn: () => fetchMyCollection(userId.value!),
    enabled: computed(() => !!userId.value),
  })

  const collectionMap = computed(() => data.value ?? new Map<string, number>())

  const mutation = useMutation({
    mutationFn: ({ cardId, quantity }: { cardId: string; quantity: number }) => {
      if (!userId.value) throw new Error('Connecte-toi pour gérer ta collection.')
      return setCollectionQuantity(userId.value, cardId, quantity)
    },
    onMutate: async ({ cardId, quantity }) => {
      if (!userId.value) return
      const key = collectionKeys.mine(userId.value)
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<Map<string, number>>(key)
      const next = new Map(previous ?? [])
      if (quantity <= 0) next.delete(cardId)
      else next.set(cardId, quantity)
      queryClient.setQueryData(key, next)
      return { key, previous }
    },
    onError: (err, _vars, context) => {
      if (context) queryClient.setQueryData(context.key, context.previous)
      toast.error(toUserMessage(err))
    },
    onSettled: () => {
      if (userId.value) queryClient.invalidateQueries({ queryKey: collectionKeys.mine(userId.value) })
    },
  })

  return {
    userId,
    collectionMap,
    isLoading,
    error,
    isOwned: (cardId: string) => collectionMap.value.has(cardId),
    ownedQuantity: (cardId: string) => collectionMap.value.get(cardId) ?? 0,
    toggleOwned: (cardId: string, owned: boolean) => mutation.mutate({ cardId, quantity: owned ? 1 : 0 }),
    setQuantity: (cardId: string, quantity: number) => mutation.mutate({ cardId, quantity }),
  }
}
