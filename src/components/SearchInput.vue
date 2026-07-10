<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { onUnmounted } from 'vue'
import { Debouncer } from '@tanstack/pacer'
import { SearchIcon } from '@lucide/vue'
import Input from '@/components/ui/input/Input.vue'

const props = withDefaults(defineProps<{
  modelValue?: string
  placeholder?: string
  class?: HTMLAttributes['class']
  debounceMs?: number
}>(), {
  debounceMs: 300,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const debouncer = new Debouncer(
  (value: string) => emit('update:modelValue', value),
  { wait: props.debounceMs },
)

onUnmounted(() => debouncer.cancel())
</script>

<template>
  <div class="relative" :class="props.class">
    <SearchIcon class="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
    <Input
      :model-value="modelValue"
      type="search"
      :placeholder="placeholder"
      class="pl-8"
      @update:model-value="debouncer.maybeExecute(String($event))"
    />
  </div>
</template>
