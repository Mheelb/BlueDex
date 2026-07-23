<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { LoaderCircleIcon } from '@lucide/vue'
import { cn } from '@/lib/utils'

const props = withDefaults(
  defineProps<{
    loading?: boolean
    error?: string | null
    empty?: boolean
    emptyMessage?: string
    class?: HTMLAttributes['class']
  }>(),
  {
    loading: false,
    error: null,
    empty: false,
  },
)
</script>

<template>
  <template v-if="loading">
    <slot name="loading">
      <div :class="cn('flex items-center justify-center py-8 text-muted-foreground', props.class)">
        <LoaderCircleIcon class="size-5 animate-spin" />
        <span class="sr-only">Chargement...</span>
      </div>
    </slot>
  </template>
  <p v-else-if="error" :class="cn('text-destructive', props.class)">{{ error }}</p>
  <template v-else-if="empty">
    <slot name="empty">
      <p :class="cn('text-muted-foreground', props.class)">{{ emptyMessage }}</p>
    </slot>
  </template>
  <div v-else class="animate-in fade-in-0 slide-in-from-bottom-2 duration-500">
    <slot />
  </div>
</template>
