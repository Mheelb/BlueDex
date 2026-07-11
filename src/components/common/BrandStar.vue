<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

const props = withDefaults(
  defineProps<{
    color?: string
    class?: HTMLAttributes['class']
  }>(),
  {
    color: 'currentColor',
  },
)
</script>

<template>
  <span
    :class="cn('inline-block shrink-0', props.class)"
    :style="{
      backgroundColor: color,
      maskImage: 'url(/symbols/star.avif)',
      WebkitMaskImage: 'url(/symbols/star.avif)',
      maskRepeat: 'no-repeat',
      WebkitMaskRepeat: 'no-repeat',
      maskPosition: 'center',
      WebkitMaskPosition: 'center',
      maskSize: 'contain',
      WebkitMaskSize: 'contain',
    }"
    aria-hidden="true"
  />
</template>
