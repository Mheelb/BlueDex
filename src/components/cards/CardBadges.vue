<script setup lang="ts">
import type { Card } from '@/types/card'
import { TYPE_COLORS } from '@/types/card'
import { Badge } from '@/components/ui/badge'

defineProps<{ card: Card }>()
</script>

<template>
  <div class="flex flex-wrap gap-2">
    <Badge class="bg-primary text-primary-foreground">{{ card.rarity }}</Badge>
    <Badge
      v-if="card.type"
      :style="{ backgroundColor: TYPE_COLORS[card.type].bg, color: TYPE_COLORS[card.type].text }"
    >
      {{ card.type }}
    </Badge>
    <Badge v-if="card.subtype" variant="secondary">{{ card.subtype }}</Badge>
    <Badge v-if="card.faction" variant="secondary">{{ card.faction }}</Badge>
  </div>
</template>
