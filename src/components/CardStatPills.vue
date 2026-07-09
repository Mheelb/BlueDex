<script setup lang="ts">
import type { Card } from '@/types/card'

defineProps<{ card: Card }>()
</script>

<template>
  <div v-if="card.cost !== null || card.power !== null || card.support !== null" class="flex gap-6">
    <div v-if="card.cost !== null" class="flex flex-col items-center gap-1.5">
      <div class="flex size-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
        {{ card.cost }}
      </div>
      <span class="text-xs text-muted-foreground">Coût</span>
    </div>
    <div v-if="card.power !== null" class="flex flex-col items-center gap-1.5">
      <div class="flex size-10 items-center justify-center rounded-full bg-[#E6003E] text-sm font-bold text-white">
        {{ card.power }}
      </div>
      <span class="text-xs text-muted-foreground">Puissance</span>
    </div>
    <div v-if="card.support !== null" class="flex flex-col items-center gap-1.5">
      <div class="flex size-10 items-center justify-center rounded-full bg-[#0097AF] text-sm font-bold text-white">
        {{ card.support }}
      </div>
      <span class="text-xs text-muted-foreground">Soutien</span>
    </div>
  </div>
</template>
