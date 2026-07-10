<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { LayersIcon } from '@lucide/vue'
import { supabase } from '@/lib/supabase'
import type { CardSet } from '@/types/card'
import SetsHero from '@/components/SetsHero.vue'

const sets = ref<CardSet[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

function formatDate(date: string | null) {
  if (!date) return null
  return new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

onMounted(async () => {
  const { data, error: fetchError } = await supabase
    .from('sets')
    .select('*')
    .order('release_date', { ascending: false })

  if (fetchError) {
    error.value = fetchError.message
  } else {
    sets.value = data as CardSet[]
  }
  loading.value = false
})
</script>

<template>
  <SetsHero :sets="sets" :loading="loading" />

  <p v-if="loading" class="text-muted-foreground">Chargement...</p>
  <p v-else-if="error" class="text-destructive">{{ error }}</p>
  <p v-else-if="sets.length === 0" class="text-muted-foreground">Aucun set pour le moment.</p>

  <div v-else class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
    <RouterLink v-for="set in sets" :key="set.id" :to="{ name: 'set', params: { setSlug: set.slug } }" class="group">
      <div
        class="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-2xl border bg-gradient-to-br from-primary to-primary/70 shadow-sm transition-all duration-300 group-hover:-translate-y-1.5 group-hover:shadow-xl"
      >
        <img
          v-if="set.logo_url || set.symbol_url"
          :src="set.logo_url ?? set.symbol_url ?? undefined"
          :alt="set.name"
          class="max-h-[65%] max-w-[70%] object-contain drop-shadow-lg transition-transform duration-300 group-hover:scale-105"
        />
        <LayersIcon v-else class="size-20 text-primary-foreground/30" />
      </div>

      <div class="mt-3">
        <p class="truncate text-lg font-semibold">{{ set.name }}</p>
        <div class="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
          <span v-if="formatDate(set.release_date)">{{ formatDate(set.release_date) }}</span>
          <span v-if="formatDate(set.release_date)">·</span>
          <span>{{ set.card_count }} cartes</span>
        </div>
      </div>
    </RouterLink>
  </div>
</template>
