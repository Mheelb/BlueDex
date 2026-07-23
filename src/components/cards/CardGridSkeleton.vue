<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

const props = withDefaults(defineProps<{ count?: number; class?: HTMLAttributes['class'] }>(), { count: 14 })
</script>

<template>
  <div
    :class="
      cn(
        'grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7',
        props.class,
      )
    "
    aria-hidden="true"
  >
    <div v-for="i in props.count" :key="i" class="flex flex-col gap-2">
      <Skeleton class="aspect-[5/7] w-full rounded-xl" />
      <Skeleton class="mx-auto h-3 w-3/4" />
      <Skeleton class="mx-auto h-3 w-1/3" />
    </div>
  </div>
</template>
