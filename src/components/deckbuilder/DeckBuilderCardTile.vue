<script setup lang="ts">
import { StarIcon } from '@lucide/vue'
import type { Card } from '@/types/card'
import CardImage from '@/components/CardImage.vue'

const props = defineProps<{
  card: Card
  quantity?: number
  disabled?: boolean
  draggable?: boolean
  showCoverAction?: boolean
  isCover?: boolean
}>()

const emit = defineEmits<{
  click: []
  'set-cover': []
}>()

function onDragStart(event: DragEvent) {
  if (!event.dataTransfer) return
  event.dataTransfer.setData('text/plain', props.card.id)
  event.dataTransfer.effectAllowed = 'copy'
}
</script>

<template>
  <div class="group">
    <div class="relative">
      <button
        type="button"
        class="block w-full select-none text-left disabled:cursor-not-allowed disabled:opacity-40"
        :disabled="disabled"
        :draggable="draggable && !disabled"
        @dragstart="onDragStart"
        @click="emit('click')"
      >
        <CardImage :src="card.image_url" :alt="card.name" :is-holo="card.is_holo" />
      </button>

      <span
        v-if="quantity"
        class="absolute -right-2 -top-2 flex size-6 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground shadow"
      >
        ×{{ quantity }}
      </span>

      <button
        v-if="showCoverAction"
        type="button"
        class="absolute -bottom-2 -left-2 flex size-6 items-center justify-center rounded-full shadow transition-colors"
        :class="isCover ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:text-primary'"
        :title="isCover ? 'Carte de couverture du deck' : 'Utiliser comme carte de couverture'"
        @click.stop="emit('set-cover')"
      >
        <StarIcon class="size-3.5" :fill="isCover ? 'currentColor' : 'none'" />
      </button>
    </div>

    <div class="mt-2 text-center">
      <p class="truncate text-sm font-medium">{{ card.name }}</p>
      <p class="text-xs text-muted-foreground">#{{ card.number }}</p>
    </div>
  </div>
</template>
