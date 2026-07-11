<script setup lang="ts">
import type { Card } from '@/types/card'
import StatPill from '@/components/cards/StatPill.vue'

defineProps<{ card: Card }>()
</script>

<template>
  <div v-if="card.cost !== null || card.power !== null || card.support !== null" class="flex gap-6">
    <StatPill v-if="card.cost !== null" :value="card.cost" label="Coût" color="primary" />
    <StatPill v-if="card.power !== null" :value="card.power" label="Puissance" color="power" />
    <StatPill v-if="card.support !== null" :value="card.support" label="Soutien" color="support" />
  </div>
</template>
