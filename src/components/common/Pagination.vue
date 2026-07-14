<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { ChevronLeftIcon, ChevronRightIcon } from '@lucide/vue'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

const props = defineProps<{
  page: number
  pageCount: number
  class?: HTMLAttributes['class']
}>()

const emit = defineEmits<{
  'update:page': [value: number]
}>()
</script>

<template>
  <div v-if="pageCount > 1" :class="cn('flex items-center justify-center gap-3', props.class)">
    <Button variant="outline" size="icon" :disabled="page === 0" @click="emit('update:page', page - 1)">
      <ChevronLeftIcon />
    </Button>
    <span class="text-sm text-muted-foreground">Page {{ page + 1 }} / {{ pageCount }}</span>
    <Button variant="outline" size="icon" :disabled="page >= pageCount - 1" @click="emit('update:page', page + 1)">
      <ChevronRightIcon />
    </Button>
  </div>
</template>
