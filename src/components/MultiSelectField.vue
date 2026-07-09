<script setup lang="ts">
import { computed } from 'vue'
import type { HTMLAttributes } from 'vue'
import { ChevronDownIcon } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

export interface MultiSelectOption {
  value: string
  label: string
}

const props = defineProps<{
  modelValue: string[]
  options: MultiSelectOption[]
  placeholder: string
  class?: HTMLAttributes['class']
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
}>()

const triggerLabel = computed(() => {
  if (props.modelValue.length === 0) return props.placeholder
  if (props.modelValue.length === 1) {
    return props.options.find((option) => option.value === props.modelValue[0])?.label ?? props.placeholder
  }
  return `${props.placeholder} (${props.modelValue.length})`
})

function toggle(value: string, checked: boolean) {
  const next = checked ? [...props.modelValue, value] : props.modelValue.filter((v) => v !== value)
  emit('update:modelValue', next)
}
</script>

<template>
  <Popover>
    <PopoverTrigger as-child>
      <Button variant="outline" size="sm" :class="['justify-between font-normal', props.class]">
        {{ triggerLabel }}
        <ChevronDownIcon class="text-muted-foreground" />
      </Button>
    </PopoverTrigger>
    <PopoverContent class="flex w-56 flex-col gap-1" align="start">
      <label
        v-for="option in options"
        :key="option.value"
        class="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
      >
        <Checkbox
          :model-value="modelValue.includes(option.value)"
          @update:model-value="(checked) => toggle(option.value, checked === true)"
        />
        {{ option.label }}
      </label>
    </PopoverContent>
  </Popover>
</template>
