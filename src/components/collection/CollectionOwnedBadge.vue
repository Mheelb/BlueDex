<script setup lang="ts">
import { CheckIcon } from '@lucide/vue'

defineProps<{ owned?: boolean }>()

const emit = defineEmits<{ toggle: [] }>()
</script>

<template>
  <button
    type="button"
    class="absolute top-2 right-2 z-10 flex size-6 items-center justify-center rounded-full border transition-colors"
    :class="
      owned
        ? 'border-primary bg-primary text-primary-foreground'
        : 'border-white/50 bg-black/30 text-transparent backdrop-blur-sm hover:border-white'
    "
    :aria-pressed="owned"
    :title="owned ? 'Retirer de la collection' : 'Ajouter à la collection'"
    @click.stop.prevent="emit('toggle')"
  >
    <CheckIcon class="size-4" />
  </button>
</template>
