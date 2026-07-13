<script setup lang="ts">
import { useQuery } from '@tanstack/vue-query'
import { fetchSets, setKeys } from '@/queries/sets'
import { usePageSeo } from '@/lib/seo'
import SetsHero from '@/components/sets/SetsHero.vue'
import SetCard from '@/components/sets/SetCard.vue'
import QueryState from '@/components/common/QueryState.vue'

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
    <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      <SetCard v-for="set in sets ?? []" :key="set.id" :set="set" />
    </div>
  </QueryState>
</template>
