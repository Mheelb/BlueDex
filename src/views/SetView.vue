<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { createEmptyCardFilters } from '@/types/card'
import { filterAndSortCards } from '@/lib/filterCards'
import { useSetBySlug } from '@/composables/useSetBySlug'
import { cardKeys, fetchCardsBySet } from '@/queries/cards'
import CardFilters from '@/components/CardFilters.vue'
import CardTile from '@/components/CardTile.vue'
import BackButton from '@/components/BackButton.vue'
import QueryState from '@/components/QueryState.vue'

const props = defineProps<{ setSlug: string }>()

const { data: set, isPending: setLoading, error: setError } = useSetBySlug(() => props.setSlug)

const setId = computed(() => set.value?.id)
const { data: cards, isPending: cardsLoading, error: cardsError } = useQuery({
  queryKey: computed(() => cardKeys.bySet(setId.value ?? '')),
  queryFn: () => fetchCardsBySet(setId.value!),
  enabled: computed(() => !!setId.value),
})

const loading = computed(() => setLoading.value || (!!setId.value && cardsLoading.value))
const error = computed(() => setError.value?.message ?? cardsError.value?.message ?? null)

const filters = ref(createEmptyCardFilters())
watch(() => props.setSlug, () => {
  filters.value = createEmptyCardFilters()
})

const filteredCards = computed(() => filterAndSortCards(cards.value ?? [], filters.value))
</script>

<template>
    <template v-if="set">
      <BackButton :to="{ name: 'sets' }" label="Retour aux sets" class="mb-2" />

      <div class="mb-6 flex items-center gap-4">
        <img v-if="set.symbol_url" :src="set.symbol_url" :alt="set.name" class="h-10 w-10 object-contain" />
        <div>
          <h1 class="text-3xl font-bold">{{ set.name }}</h1>
          <p class="mt-0.5 text-sm text-muted-foreground">{{ filteredCards.length }} / {{ (cards ?? []).length }} cartes</p>
        </div>
      </div>

      <CardFilters v-model="filters" class="mb-6" />

      <QueryState :loading="loading" :error="error" :empty="filteredCards.length === 0" empty-message="Aucune carte ne correspond aux filtres.">
        <div class="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
          <CardTile v-for="card in filteredCards" :key="card.id" :card="card" :set-slug="set.slug" />
        </div>
      </QueryState>
    </template>
</template>
