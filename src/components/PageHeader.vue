<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps<{
  title: string
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <div :class="cn('mb-6 flex items-center justify-between', props.class)">
    <h1 class="text-2xl font-bold">{{ title }}</h1>
    <div class="flex items-center gap-2">
      <slot />
    </div>
  </div>
</template>
