<script setup lang="ts">
import { computed } from 'vue'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'

const props = defineProps<{
  label: string
  modelValue: [number, number]
  min: number
  max: number
  step?: number
}>()

const emit = defineEmits<{
  'update:modelValue': [value: [number, number]]
}>()

const range = computed({
  get: () => props.modelValue,
  set: (value: number[]) => emit('update:modelValue', [value[0], value[1]]),
})
</script>

<template>
  <div class="flex flex-col gap-2">
    <div class="flex items-center justify-between">
      <Label>{{ label }}</Label>
      <span class="text-xs text-muted-foreground">{{ range[0] }} – {{ range[1] }}</span>
    </div>
    <Slider v-model="range" :min="min" :max="max" :step="step ?? 1" />
  </div>
</template>
