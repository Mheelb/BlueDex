<script setup lang="ts">
import { useQuery } from '@tanstack/vue-query'
import { fetchSets, setKeys } from '@/queries/sets'
import { usePageSeo } from '@/lib/seo'
import SetsHero from '@/components/sets/SetsHero.vue'
import SetCard from '@/components/sets/SetCard.vue'
import QueryState from '@/components/common/QueryState.vue'
import { Skeleton } from '@/components/ui/skeleton'

usePageSeo({
  title: 'Tous les sets Blue Rising',
  description:
    'Tous les sets du TCG Blue Rising : parcours les cartes, filtre-les par faction ou rareté et prépare tes decks.',
  path: '/sets',
})

const {
  data: sets,
  isPending: loading,
  error,
} = useQuery({
  queryKey: setKeys.list('release_date'),
  queryFn: () => fetchSets('release_date'),
})
</script>

<template>
  <SetsHero :sets="sets ?? []" :loading="loading" />

  <QueryState
    :loading="loading"
    :error="error?.message"
    :empty="sets?.length === 0"
    empty-message="Aucun set pour le moment."
  >
    <template #loading>
      <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
        <Skeleton v-for="i in 6" :key="i" class="aspect-[4/3] w-full rounded-2xl" />
      </div>
    </template>
    <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      <SetCard v-for="set in sets ?? []" :key="set.id" :set="set" />
    </div>
  </QueryState>
</template>
