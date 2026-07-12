<script setup lang="ts">
import type { SelectRootEmits, SelectRootProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { useForwardPropsEmits } from 'reka-ui'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export interface SelectFieldOption {
  value: string
  label: string
}

const props = defineProps<
  SelectRootProps & {
    options: SelectFieldOption[]
    placeholder?: string
    class?: HTMLAttributes['class']
  }
>()

const emit = defineEmits<SelectRootEmits>()

const delegatedProps = reactiveOmit(props, 'options', 'placeholder', 'class')
const forwarded = useForwardPropsEmits(delegatedProps, emit)
</script>

<template>
  <Select v-bind="forwarded">
    <SelectTrigger :class="props.class">
      <SelectValue :placeholder="placeholder" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem v-for="option in options" :key="option.value" :value="option.value">
        {{ option.label }}
      </SelectItem>
    </SelectContent>
  </Select>
</template>
