<script setup lang="ts">
import { computed } from 'vue'
import type { CardSet } from '@/types/card'
import { Badge } from '@/components/ui/badge'
import PageIntro from '@/components/common/PageIntro.vue'

const props = defineProps<{
  sets: CardSet[]
  loading: boolean
}>()

const totalCards = computed(() => props.sets.reduce((sum, s) => sum + s.card_count, 0))
</script>

<template>
  <PageIntro
    eyebrow="TCG · Blue Rising"
    title="Tous les sets disponible"
    description="Parcours chaque set, filtre les cartes par rareté, type ou faction, et découvre le détail de chacune d'elles."
  >
    <template v-if="!loading && sets.length > 0">
      <Badge variant="secondary" class="text-sm">{{ sets.length }} set{{ sets.length > 1 ? 's' : '' }}</Badge>
      <Badge variant="secondary" class="text-sm">{{ totalCards }} cartes</Badge>
    </template>
  </PageIntro>
</template>
