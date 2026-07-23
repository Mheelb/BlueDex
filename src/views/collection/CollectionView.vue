<script setup lang="ts">
import { computed } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { useMyCollection } from '@/composables/useMyCollection'
import { setKeys, fetchSets } from '@/queries/sets'
import { cardKeys, fetchCardSetIndex } from '@/queries/cards'
import type { SetCollectionProgress } from '@/types/collection'
import { toUserMessage } from '@/lib/errorMessage'
import { usePageSeo } from '@/lib/seo'
import PageIntro from '@/components/common/PageIntro.vue'
import CollectionSetProgress from '@/components/collection/CollectionSetProgress.vue'
import QueryState from '@/components/common/QueryState.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import { Button } from '@/components/ui/button'

usePageSeo({
  title: 'Ma collection',
  description: 'Suis ta collection de cartes Blue Rising : cartes possédées, exemplaires et cartes manquantes.',
  path: '/collection',
})

const { collectionMap, isLoading: collectionLoading, error: collectionError } = useMyCollection()

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
  queryKey: cardKeys.setIndex(),
  queryFn: fetchCardSetIndex,
})

const loading = computed(() => setsLoading.value || cardsLoading.value || collectionLoading.value)
const error = computed(() => {
  const err = setsError.value ?? cardsError.value ?? collectionError.value
  return err ? toUserMessage(err) : null
})

const progressBySet = computed<SetCollectionProgress[]>(() => {
  return (sets.value ?? []).map((set) => {
    const setCards = (allCards.value ?? []).filter((card) => card.set_id === set.id)
    const owned = setCards.filter((card) => collectionMap.value.has(card.id)).length
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

  <QueryState :loading="loading" :error="error" :empty="progressBySet.length === 0">
    <template #empty>
      <EmptyState
        title="Rien à afficher"
        message="Parcours les sets et coche les cartes que tu possèdes pour suivre ta collection."
      >
        <Button as-child variant="outline" size="sm">
          <RouterLink :to="{ name: 'sets' }">Parcourir les sets</RouterLink>
        </Button>
      </EmptyState>
    </template>
    <div class="flex flex-col gap-3">
      <CollectionSetProgress v-for="progress in progressBySet" :key="progress.set.id" :progress="progress" />
    </div>
  </QueryState>
</template>
