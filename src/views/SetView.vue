<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { supabase } from '@/lib/supabase'
import type { Card, CardSet } from '@/types/card'
import { createEmptyCardFilters } from '@/types/card'
import { filterAndSortCards } from '@/lib/filterCards'
import CardFilters from '@/components/CardFilters.vue'
import CardTile from '@/components/CardTile.vue'
import BackButton from '@/components/BackButton.vue'

const props = defineProps<{ setSlug: string }>()

const set = ref<CardSet | null>(null)
const cards = ref<Card[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const filters = ref(createEmptyCardFilters())

async function load() {
  loading.value = true
  error.value = null
  filters.value = createEmptyCardFilters()

  const { data: setData, error: setError } = await supabase
    .from('sets')
    .select('*')
    .eq('slug', props.setSlug)
    .single()

  if (setError || !setData) {
    error.value = setError?.message ?? 'Set introuvable.'
    loading.value = false
    return
  }
  set.value = setData as CardSet

  const { data: cardsData, error: cardsError } = await supabase
    .from('cards')
    .select('*')
    .eq('set_id', set.value.id)

  if (cardsError) {
    error.value = cardsError.message
  } else {
    cards.value = cardsData as Card[]
  }
  loading.value = false
}

onMounted(load)
watch(() => props.setSlug, load)

const filteredCards = computed(() => filterAndSortCards(cards.value, filters.value))
</script>

<template>
  <div class="mx-auto max-w-screen-2xl px-4 py-8 sm:px-6 lg:px-8">
    <p v-if="loading" class="text-slate-400">Chargement...</p>
    <p v-else-if="error" class="text-red-400">{{ error }}</p>

    <template v-else-if="set">
      <BackButton :to="{ name: 'sets' }" label="Retour aux sets" class="mb-2" />

      <div class="mb-6 flex items-center gap-4">
        <img v-if="set.symbol_url" :src="set.symbol_url" :alt="set.name" class="h-10 w-10 object-contain" />
        <div>
          <h1 class="text-3xl font-bold">{{ set.name }}</h1>
          <p class="mt-0.5 text-sm text-muted-foreground">{{ filteredCards.length }} / {{ cards.length }} cartes</p>
        </div>
      </div>

      <CardFilters v-model="filters" class="mb-6" />

      <p v-if="filteredCards.length === 0" class="text-slate-400">Aucune carte ne correspond aux filtres.</p>
      <div v-else class="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
        <CardTile v-for="card in filteredCards" :key="card.id" :card="card" :set-slug="set.slug" />
      </div>
    </template>
  </div>
</template>
