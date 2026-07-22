<script setup lang="ts">
import { computed } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { filterAndSortCards } from '@/lib/filterCards'
import { toUserMessage } from '@/lib/errorMessage'
import { useCardFiltersQuery } from '@/composables/useCardFiltersQuery'
import { useMyCollection } from '@/composables/useMyCollection'
import { useSetBySlug } from '@/composables/useSetBySlug'
import { cardKeys, fetchCardsBySet } from '@/queries/cards'
import { usePageSeo } from '@/lib/seo'
import { cdnImage } from '@/lib/imageCdn'
import CardFilters from '@/components/cards/CardFilters.vue'
import CardTile from '@/components/cards/CardTile.vue'
import CardGridSkeleton from '@/components/cards/CardGridSkeleton.vue'
import VirtualCardGrid from '@/components/cards/VirtualCardGrid.vue'
import BackButton from '@/components/common/BackButton.vue'
import QueryState from '@/components/common/QueryState.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import Heading from '@/components/common/Heading.vue'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'

const props = defineProps<{ setSlug: string }>()

const { data: set, isPending: setLoading, error: setError } = useSetBySlug(() => props.setSlug)

const setId = computed(() => set.value?.id)
const {
  data: cards,
  isPending: cardsLoading,
  error: cardsError,
} = useQuery({
  queryKey: computed(() => cardKeys.bySet(setId.value ?? '')),
  queryFn: () => fetchCardsBySet(setId.value!),
  enabled: computed(() => !!setId.value),
})

const loading = computed(() => setLoading.value || (!!setId.value && cardsLoading.value))
const error = computed(() => {
  const err = setError.value ?? cardsError.value
  return err ? toUserMessage(err) : null
})

const { filters, flags, reset: resetFilters } = useCardFiltersQuery({ flags: ['missing'] })

const { userId, collectionMap, toggleOwned } = useMyCollection()

const ownedInSet = computed(() => (cards.value ?? []).filter((card) => collectionMap.value.has(card.id)).length)

const filteredCards = computed(() => {
  const base = filterAndSortCards(cards.value ?? [], filters.value)
  return flags.missing ? base.filter((card) => !collectionMap.value.has(card.id)) : base
})

function onToggleOwned(cardId: string) {
  toggleOwned(cardId, !collectionMap.value.has(cardId))
}

usePageSeo({
  title: () => set.value?.name,
  description: () =>
    set.value ? `Toutes les cartes du set ${set.value.name} de Blue Rising : liste, filtres et détails.` : undefined,
  path: () => `/sets/${props.setSlug}`,
  image: () => set.value?.symbol_url ?? undefined,
})
</script>

<template>
  <template v-if="set">
    <BackButton :to="{ name: 'sets' }" label="Retour aux sets" class="mb-2" />

    <div class="mb-6 flex items-center gap-4">
      <img v-if="set.symbol_url" :src="cdnImage(set.symbol_url, 96)" :alt="set.name" class="h-10 w-10 object-contain" />
      <div>
        <Heading>{{ set.name }}</Heading>
        <p class="mt-0.5 text-sm text-muted-foreground">
          {{ filteredCards.length }} / {{ (cards ?? []).length }} cartes
        </p>
        <template v-if="userId">
          <p class="mt-1 text-sm text-primary">{{ ownedInSet }} / {{ (cards ?? []).length }} possédées</p>
          <div class="mt-1 h-1.5 w-40 overflow-hidden rounded-full bg-muted">
            <div
              class="h-full rounded-full bg-primary transition-all"
              :style="{ width: `${(cards ?? []).length ? (ownedInSet / (cards ?? []).length) * 100 : 0}%` }"
            />
          </div>
        </template>
      </div>
    </div>

    <div class="mb-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <CardFilters v-model="filters" :cards="cards" class="w-full sm:flex-1" />
      <label v-if="userId" class="flex shrink-0 items-center gap-2 text-sm text-muted-foreground">
        <Checkbox :model-value="flags.missing" @update:model-value="(v) => (flags.missing = !!v)" />
        Cartes manquantes uniquement
      </label>
    </div>

    <QueryState :loading="loading" :error="error" :empty="filteredCards.length === 0">
      <template #loading>
        <CardGridSkeleton />
      </template>
      <template #empty>
        <EmptyState title="Aucune carte" message="Aucune carte ne correspond à tes filtres.">
          <Button variant="outline" size="sm" @click="resetFilters">Réinitialiser les filtres</Button>
        </EmptyState>
      </template>
      <VirtualCardGrid :cards="filteredCards">
        <template #default="{ card }">
          <CardTile
            :card="card"
            :set-slug="set.slug"
            :show-collection-toggle="!!userId"
            :owned="collectionMap.has(card.id)"
            @toggle-owned="onToggleOwned(card.id)"
          />
        </template>
      </VirtualCardGrid>
    </QueryState>
  </template>
</template>
