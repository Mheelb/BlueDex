<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { useSlots } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps<{ title?: string; message?: string; class?: HTMLAttributes['class'] }>()
const slots = useSlots()
</script>

<template>
  <div
    :class="cn('flex flex-col items-center gap-3 rounded-lg border border-dashed px-6 py-14 text-center', props.class)"
  >
    <div v-if="slots.icon" class="text-muted-foreground [&>svg]:size-8">
      <slot name="icon" />
    </div>
    <p v-if="props.title" class="font-medium text-foreground">{{ props.title }}</p>
    <p v-if="props.message" class="max-w-sm text-sm text-muted-foreground">{{ props.message }}</p>
    <div v-if="slots.default" class="mt-1">
      <slot />
    </div>
  </div>
</template>
