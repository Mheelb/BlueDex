<script setup lang="ts">
import { computed } from 'vue'
import type { CardSet } from '@/types/card'
import { Badge } from '@/components/ui/badge'
import Heading from '@/components/Heading.vue'

const props = defineProps<{
  sets: CardSet[]
  loading: boolean
}>()

const totalCards = computed(() => props.sets.reduce((sum, s) => sum + s.card_count, 0))
</script>

<template>
  <div class="mb-10 border-b pb-8">
    <p class="text-sm font-semibold tracking-wide text-primary uppercase">TCG · Blue Rising</p>
    <Heading size="hero" class="mt-2">BlueDex</Heading>
    <p class="mt-3 max-w-xl text-muted-foreground">
      Parcours chaque set, filtre les cartes par rareté, type ou faction, et découvre le détail de chacune d'elles.
    </p>

    <div v-if="!loading && sets.length > 0" class="mt-5 flex flex-wrap gap-2">
      <Badge variant="secondary" class="text-sm">{{ sets.length }} set{{ sets.length > 1 ? 's' : '' }}</Badge>
      <Badge variant="secondary" class="text-sm">{{ totalCards }} cartes</Badge>
    </div>
  </div>
</template>
