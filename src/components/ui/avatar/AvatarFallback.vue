<script setup lang="ts">
import type { AvatarFallbackProps } from "reka-ui"
import type { HTMLAttributes } from "vue"
import { reactiveOmit } from "@vueuse/core"
import { AvatarFallback, useForwardProps } from "reka-ui"
import { cn } from "@/lib/utils"

const props = defineProps<AvatarFallbackProps & { class?: HTMLAttributes["class"] }>()
const delegatedProps = reactiveOmit(props, "class")
const forwarded = useForwardProps(delegatedProps)
</script>

<template>
  <AvatarFallback
    data-slot="avatar-fallback"
    v-bind="forwarded"
    :class="cn('bg-muted flex size-full items-center justify-center rounded-full text-xs font-medium', props.class)"
  >
    <slot />
  </AvatarFallback>
</template>
