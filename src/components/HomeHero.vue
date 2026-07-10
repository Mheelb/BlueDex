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
  <div
    class="relative mb-10 overflow-hidden rounded-md border border-primary/40 bg-gradient-to-br from-[#31496f] via-[#16233f] to-[#6b5226]"
  >
    <div class="pointer-events-none absolute inset-2.5 rounded-sm border border-primary/25" aria-hidden="true" />
    <div
      class="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_bottom_right,rgba(233,214,160,0.22),transparent_55%)]"
      aria-hidden="true"
    />

    <div class="grid grid-cols-1 items-center gap-8 px-8 py-12 sm:px-12 sm:py-14 lg:grid-cols-[1.15fr_0.85fr]">
      <div class="relative z-10">
        <p class="font-engraved text-xs font-bold tracking-[0.22em] text-primary uppercase">TCG · Blue Rising</p>
        <h1 class="mt-4 font-blackletter text-6xl leading-none text-foreground sm:text-7xl">BlueDex</h1>
        <p class="mt-5 max-w-md text-base text-muted-foreground">
          <span class="font-bold text-gold-bright tabular-nums">{{ totalCards }}</span> cartes répertoriées dans ce
          tome. Explore la collection, repère les holos, construis ton deck.
        </p>

        <div class="mt-8 flex flex-wrap gap-3">
          <Button
            as-child
            size="lg"
            class="rounded-sm bg-primary font-engraved text-xs font-bold tracking-[0.06em] text-primary-foreground uppercase hover:bg-gold-bright"
          >
            <RouterLink :to="{ name: 'sets' }">Explorer les cartes</RouterLink>
          </Button>
          <Button
            as-child
            size="lg"
            variant="outline"
            class="rounded-sm border-primary/60 bg-transparent font-engraved text-xs font-bold tracking-[0.06em] text-primary uppercase hover:bg-white/5 hover:text-gold-bright"
          >
            <RouterLink :to="{ name: 'deck-builder' }">Construire un deck</RouterLink>
          </Button>
        </div>
      </div>

      <div v-if="featuredCards.length > 0" class="relative z-10 mx-auto h-56 w-full max-w-xs sm:h-72 sm:max-w-sm">
        <RouterLink
          v-for="(card, index) in featuredCards"
          :key="card.id"
          :to="{ name: 'card', params: { setSlug: featuredSetSlug, cardNumber: card.number } }"
          class="absolute block w-28 rounded-xl border-2 border-primary shadow-[0_14px_26px_rgba(0,0,0,0.45)] transition-transform duration-300 hover:z-20! hover:-translate-y-2 sm:w-36"
          :style="fanStyle(index)"
        >
          <CardImage :src="card.image_url" :alt="card.name" :is-holo="card.is_holo" />
        </RouterLink>
      </div>
    </div>
  </div>
</template>
