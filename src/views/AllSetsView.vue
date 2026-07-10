<script setup lang="ts">
import { LayersIcon } from '@lucide/vue'
import { useQuery } from '@tanstack/vue-query'
import { fetchSets, setKeys } from '@/queries/sets'
import SetsHero from '@/components/SetsHero.vue'
import QueryState from '@/components/QueryState.vue'

const { data: sets, isPending: loading, error } = useQuery({
  queryKey: setKeys.list('release_date'),
  queryFn: () => fetchSets('release_date'),
})

function formatDate(date: string | null) {
  if (!date) return null
  return new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}
</script>

<template>
  <SetsHero :sets="sets ?? []" :loading="loading" />

  <QueryState :loading="loading" :error="error?.message" :empty="sets?.length === 0" empty-message="Aucun set pour le moment.">
    <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      <RouterLink v-for="set in sets ?? []" :key="set.id" :to="{ name: 'set', params: { setSlug: set.slug } }" class="group">
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
  </QueryState>
</template>
