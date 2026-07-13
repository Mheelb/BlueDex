<script setup lang="ts">
import { MinusIcon, PlusIcon } from '@lucide/vue'
import { Button } from '@/components/ui/button'

const props = defineProps<{ quantity: number }>()
const emit = defineEmits<{ 'update:quantity': [value: number] }>()
</script>

<template>
  <div class="flex items-center gap-4 rounded-lg border bg-card p-4">
    <div class="flex-1">
      <p class="text-sm font-medium">Ma collection</p>
      <p class="text-xs text-muted-foreground">
        {{ props.quantity > 0 ? `${props.quantity} exemplaire${props.quantity > 1 ? 's' : ''}` : 'Non possédée' }}
      </p>
    </div>
    <div class="flex items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        :disabled="props.quantity <= 0"
        @click="emit('update:quantity', props.quantity - 1)"
      >
        <MinusIcon />
      </Button>
      <span class="w-6 text-center text-sm tabular-nums">{{ props.quantity }}</span>
      <Button variant="outline" size="icon" @click="emit('update:quantity', props.quantity + 1)">
        <PlusIcon />
      </Button>
    </div>
  </div>
</template>
