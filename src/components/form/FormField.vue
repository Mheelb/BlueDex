<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

const props = defineProps<{
  label?: string
  for?: string
  error?: string
  required?: boolean
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <div :class="cn('flex flex-col gap-1.5', props.class)">
    <Label v-if="label" :for="props.for">
      {{ label }}<span v-if="required" class="text-destructive"> *</span>
    </Label>
    <slot />
    <p v-if="error" class="text-xs text-destructive">{{ error }}</p>
  </div>
</template>
