<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'
import Heading from '@/components/common/Heading.vue'

const props = defineProps<{
  title: string
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <div :class="cn('mb-6 flex items-center justify-between', props.class)">
    <Heading size="2xl">{{ title }}</Heading>
    <div class="flex items-center gap-2">
      <slot />
    </div>
  </div>
</template>
