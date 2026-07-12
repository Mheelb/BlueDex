<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import type { SeparatorProps } from 'reka-ui'
import { reactiveOmit } from '@vueuse/core'
import { Separator } from 'reka-ui'
import { cn } from '@/lib/utils'
import BrandStar from '@/components/common/BrandStar.vue'

const props = withDefaults(defineProps<SeparatorProps & { class?: HTMLAttributes['class']; ornament?: boolean }>(), {
  orientation: 'horizontal',
  ornament: false,
})

const delegatedProps = reactiveOmit(props, 'class', 'ornament')
</script>

<template>
  <div v-if="ornament" data-slot="separator" role="separator" :class="cn('flex items-center gap-4', props.class)">
    <span class="h-px min-w-0 flex-1 bg-border" />
    <BrandStar color="#c9a865" class="h-12 w-20" />
    <span class="h-px min-w-0 flex-1 bg-border" />
  </div>
  <Separator
    v-else
    data-slot="separator"
    v-bind="delegatedProps"
    :class="
      cn(
        'bg-border shrink-0 data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px',
        props.class,
      )
    "
  />
</template>
