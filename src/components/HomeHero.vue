<script setup lang="ts">
import type { Card } from '@/types/card'
import CardImage from '@/components/CardImage.vue'
import { Button } from '@/components/ui/button'

defineProps<{
  featuredCards: Card[]
  featuredSetSlug: string
  totalCards: number
}>()

const FAN = [
  { left: '0%', top: '20%', rotate: -14, z: 1 },
  { left: '30%', top: '0%', rotate: -2, z: 3 },
  { left: '60%', top: '22%', rotate: 12, z: 2 },
]

function fanStyle(index: number) {
  const f = FAN[index] ?? FAN[0]
  return {
    left: f.left,
    top: f.top,
    transform: `rotate(${f.rotate}deg)`,
    zIndex: f.z,
  }
}
</script>

<template>
  <div class="relative mb-10 overflow-hidden rounded-3xl bg-gradient-to-br from-[#0b1330] via-[#111d4a] to-[#0a1128]">
    <div
      class="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,rgba(80,130,255,0.3),transparent_60%)]"
      aria-hidden="true"
    />

    <div class="grid grid-cols-1 items-center gap-8 px-6 py-14 sm:px-12 sm:py-16 lg:grid-cols-[1.1fr_0.9fr]">
      <div>
        <p class="text-xs font-semibold tracking-[0.2em] text-blue-400 uppercase">TCG · Blue Rising</p>
        <h1 class="mt-3 text-5xl font-extrabold tracking-tight text-white sm:text-6xl">BlueDex</h1>
        <p class="mt-4 max-w-md text-zinc-400">
          {{ totalCards }} cartes répertoriées. Explore la collection, repère les holos, construis ton deck.
        </p>

        <div class="mt-8 flex flex-wrap gap-3">
          <Button as-child size="lg" class="bg-blue-500 text-white hover:bg-blue-400">
            <RouterLink :to="{ name: 'sets' }">Explorer les cartes</RouterLink>
          </Button>
          <Button
            as-child
            size="lg"
            variant="outline"
            class="border-zinc-700 bg-transparent text-white hover:bg-white/10 hover:text-white"
          >
            <RouterLink :to="{ name: 'deck-builder' }">Construire un deck</RouterLink>
          </Button>
        </div>
      </div>

      <div v-if="featuredCards.length > 0" class="relative mx-auto h-56 w-full max-w-xs sm:h-72 sm:max-w-sm">
        <RouterLink
          v-for="(card, index) in featuredCards"
          :key="card.id"
          :to="{ name: 'card', params: { setSlug: featuredSetSlug, cardNumber: card.number } }"
          class="absolute block w-28 transition-transform duration-300 hover:z-20! hover:-translate-y-2 sm:w-36"
          :style="fanStyle(index)"
        >
          <CardImage :src="card.image_url" :alt="card.name" :is-holo="card.is_holo" />
        </RouterLink>
      </div>
    </div>
  </div>
</template>
