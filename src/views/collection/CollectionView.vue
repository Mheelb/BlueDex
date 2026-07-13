<script setup lang="ts">
import { computed } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { useAuthUser } from '@/composables/useAuthUser'
import { setKeys, fetchSets } from '@/queries/sets'
import { cardKeys, fetchAllCardsWithSet } from '@/queries/cards'
import { collectionKeys, fetchMyCollection } from '@/queries/collection'
import type { SetCollectionProgress } from '@/types/collection'
import { usePageSeo } from '@/lib/seo'
import PageIntro from '@/components/common/PageIntro.vue'
import CollectionSetProgress from '@/components/collection/CollectionSetProgress.vue'
import QueryState from '@/components/common/QueryState.vue'

usePageSeo({
  title: 'Ma collection',
  description: 'Suis ta collection de cartes Blue Rising : cartes possédées, exemplaires et cartes manquantes.',
  path: '/collection',
})

const { session } = useAuthUser()
const userId = computed(() => session.value?.user.id)

const {
  data: sets,
  isPending: setsLoading,
  error: setsError,
} = useQuery({
  queryKey: setKeys.list('release_date'),
  queryFn: () => fetchSets('release_date'),
})

const {
  data: allCards,
  isPending: cardsLoading,
  error: cardsError,
} = useQuery({
  queryKey: cardKeys.allWithSet(),
  queryFn: () => fetchAllCardsWithSet(),
})

const {
  data: collection,
  isPending: collectionLoading,
  error: collectionError,
} = useQuery({
  queryKey: computed(() => collectionKeys.mine(userId.value ?? '')),
  queryFn: () => fetchMyCollection(userId.value!),
  enabled: computed(() => !!userId.value),
})

const loading = computed(() => setsLoading.value || cardsLoading.value || collectionLoading.value)
const error = computed(
  () => setsError.value?.message ?? cardsError.value?.message ?? collectionError.value?.message ?? null,
)

const progressBySet = computed<SetCollectionProgress[]>(() => {
  const collectionMap = collection.value ?? new Map<string, number>()
  return (sets.value ?? []).map((set) => {
    const setCards = (allCards.value ?? []).filter((card) => card.set_id === set.id)
    const owned = setCards.filter((card) => collectionMap.has(card.id)).length
    return { set, owned, total: setCards.length }
  })
})

const totalOwned = computed(() => progressBySet.value.reduce((sum, p) => sum + p.owned, 0))
const totalCards = computed(() => progressBySet.value.reduce((sum, p) => sum + p.total, 0))
const totalPercent = computed(() =>
  totalCards.value > 0 ? Math.round((totalOwned.value / totalCards.value) * 100) : 0,
)
</script>

<template>
  <PageIntro
    eyebrow="Collection"
    title="Ma collection"
    :description="`${totalOwned} / ${totalCards} cartes possédées — ${totalPercent}% de la collection complète.`"
  />

  <QueryState
    :loading="loading"
    :error="error"
    :empty="progressBySet.length === 0"
    empty-message="Aucun set pour le moment."
  >
    <div class="flex flex-col gap-3">
      <CollectionSetProgress v-for="progress in progressBySet" :key="progress.set.id" :progress="progress" />
    </div>
  </QueryState>
</template>
