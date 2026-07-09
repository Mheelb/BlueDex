<script setup lang="ts">
import type { Card } from '@/types/card'
import CardImage from '@/components/CardImage.vue'

const props = defineProps<{
  card: Card
  setSlug: string
}>()
</script>

<template>
  <RouterLink
    :to="{ name: 'card', params: { setSlug: props.setSlug, cardNumber: props.card.number } }"
    class="group block select-none"
  >
    <CardImage :src="props.card.image_url" :alt="props.card.name" :is-holo="props.card.is_holo" />

    <div class="mt-2 text-center">
      <p class="truncate text-sm font-medium">{{ props.card.name }}</p>
      <p class="text-xs text-primary">#{{ props.card.number }}</p>
    </div>
  </RouterLink>
</template>
