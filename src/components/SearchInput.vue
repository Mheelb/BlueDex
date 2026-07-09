<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { SearchIcon } from '@lucide/vue'
import Input from '@/components/ui/input/Input.vue'

const props = defineProps<{
  modelValue?: string
  placeholder?: string
  class?: HTMLAttributes['class']
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<template>
  <div class="relative" :class="props.class">
    <SearchIcon class="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
    <Input
      :model-value="modelValue"
      type="search"
      :placeholder="placeholder"
      class="pl-8"
      @update:model-value="emit('update:modelValue', String($event))"
    />
  </div>
</template>
