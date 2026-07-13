<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { toast } from 'vue-sonner'
import { createEmptyCardFilters } from '@/types/card'
import { filterAndSortCards } from '@/lib/filterCards'
import { useAuthUser } from '@/composables/useAuthUser'
import { useSetBySlug } from '@/composables/useSetBySlug'
import { cardKeys, fetchCardsBySet } from '@/queries/cards'
import { collectionKeys, fetchMyCollection, toggleCollectionOwned } from '@/queries/collection'
import { usePageSeo } from '@/lib/seo'
import CardFilters from '@/components/cards/CardFilters.vue'
import CardTile from '@/components/cards/CardTile.vue'
import VirtualCardGrid from '@/components/cards/VirtualCardGrid.vue'
import BackButton from '@/components/common/BackButton.vue'
import QueryState from '@/components/common/QueryState.vue'
import Heading from '@/components/common/Heading.vue'
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
const error = computed(() => setError.value?.message ?? cardsError.value?.message ?? null)

const filters = ref(createEmptyCardFilters())
const missingOnly = ref(false)
watch(
  () => props.setSlug,
  () => {
    filters.value = createEmptyCardFilters()
    missingOnly.value = false
  },
)

const { session } = useAuthUser()
const userId = computed(() => session.value?.user.id)
const queryClient = useQueryClient()

const { data: collection } = useQuery({
  queryKey: computed(() => collectionKeys.mine(userId.value ?? '')),
  queryFn: () => fetchMyCollection(userId.value!),
  enabled: computed(() => !!userId.value),
})

const collectionMap = computed(() => collection.value ?? new Map<string, number>())
const ownedInSet = computed(() => (cards.value ?? []).filter((card) => collectionMap.value.has(card.id)).length)

const filteredCards = computed(() => {
  const base = filterAndSortCards(cards.value ?? [], filters.value)
  return missingOnly.value ? base.filter((card) => !collectionMap.value.has(card.id)) : base
})

const toggleOwnedMutation = useMutation({
  mutationFn: (cardId: string) => {
    if (!userId.value) throw new Error('Connecte-toi pour gérer ta collection.')
    return toggleCollectionOwned(userId.value, cardId, !collectionMap.value.has(cardId))
  },
  onSuccess: () => {
    if (userId.value) queryClient.invalidateQueries({ queryKey: collectionKeys.mine(userId.value) })
  },
  onError: (err) => {
    toast.error(err.message)
  },
})

function onToggleOwned(cardId: string) {
  toggleOwnedMutation.mutate(cardId)
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
      <img v-if="set.symbol_url" :src="set.symbol_url" :alt="set.name" class="h-10 w-10 object-contain" />
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
      <CardFilters v-model="filters" class="w-full sm:flex-1" />
      <label v-if="userId" class="flex shrink-0 items-center gap-2 text-sm text-muted-foreground">
        <Checkbox :model-value="missingOnly" @update:model-value="(v) => (missingOnly = !!v)" />
        Cartes manquantes uniquement
      </label>
    </div>

    <QueryState
      :loading="loading"
      :error="error"
      :empty="filteredCards.length === 0"
      empty-message="Aucune carte ne correspond aux filtres."
    >
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
