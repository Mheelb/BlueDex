<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

const sizes = {
  lg: 'text-lg font-semibold',
  '2xl': 'text-2xl font-bold',
  '3xl': 'text-3xl font-bold',
  hero: 'text-5xl font-extrabold tracking-tight',
} as const

const props = withDefaults(
  defineProps<{
    as?: 'h1' | 'h2' | 'h3'
    size?: keyof typeof sizes
    class?: HTMLAttributes['class']
  }>(),
  {
    as: 'h1',
    size: '3xl',
  },
)
</script>

<template>
  <component :is="as" :class="cn(sizes[size], props.class)">
    <slot />
  </component>
</template>
