<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

const variants = {
  muted: 'text-muted-foreground hover:text-foreground',
  primary: 'text-sm text-primary hover:underline',
} as const

const props = withDefaults(
  defineProps<{
    to: RouteLocationRaw
    variant?: keyof typeof variants
    class?: HTMLAttributes['class']
  }>(),
  {
    variant: 'muted',
  },
)
</script>

<template>
  <RouterLink :to="to" :class="cn(variants[variant], props.class)">
    <slot />
  </RouterLink>
</template>
