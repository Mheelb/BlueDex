<script setup lang="ts">
import type { Card } from '@/types/card'
import CardImage from '@/components/CardImage.vue'

const props = defineProps<{
  card: Card
  quantity?: number
  disabled?: boolean
  draggable?: boolean
}>()

const emit = defineEmits<{
  click: []
}>()

function onDragStart(event: DragEvent) {
  if (!event.dataTransfer) return
  event.dataTransfer.setData('text/plain', props.card.id)
  event.dataTransfer.effectAllowed = 'copy'
}
</script>

<template>
  <button
    type="button"
    class="group relative block w-full select-none text-left disabled:cursor-not-allowed disabled:opacity-40"
    :disabled="disabled"
    :draggable="draggable && !disabled"
    @dragstart="onDragStart"
    @click="emit('click')"
  >
    <CardImage :src="card.image_url" :alt="card.name" :is-holo="card.is_holo" />
    <span
      v-if="quantity"
      class="absolute -right-2 -top-2 flex size-6 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground shadow"
    >
      ×{{ quantity }}
    </span>
    <div class="mt-2 text-center">
      <p class="truncate text-sm font-medium">{{ card.name }}</p>
      <p class="text-xs text-muted-foreground">#{{ card.number }}</p>
    </div>
  </button>
</template>
