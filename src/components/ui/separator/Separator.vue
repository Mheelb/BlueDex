<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import type { SeparatorProps } from "reka-ui"
import { reactiveOmit } from "@vueuse/core"
import { Separator } from "reka-ui"
import { cn } from "@/lib/utils"

const props = withDefaults(
  defineProps<SeparatorProps & { class?: HTMLAttributes["class"]; ornament?: boolean }>(),
  {
    orientation: "horizontal",
    ornament: false,
  },
)

const delegatedProps = reactiveOmit(props, "class", "ornament")
</script>

<template>
  <div v-if="ornament" data-slot="separator" role="separator" :class="cn('flex items-center gap-4', props.class)">
    <span class="h-px min-w-0 flex-1 bg-border" />
    <span
      class="h-12 w-20 shrink-0 bg-[#C9A865]"
      style="
        -webkit-mask-image: url(/symbols/star.avif);
        mask-image: url(/symbols/star.avif);
        -webkit-mask-repeat: no-repeat;
        mask-repeat: no-repeat;
        -webkit-mask-position: center;
        mask-position: center;
        -webkit-mask-size: contain;
        mask-size: contain;
      "
    />
    <span class="h-px min-w-0 flex-1 bg-border" />
  </div>
  <Separator
    v-else
    data-slot="separator"
    v-bind="delegatedProps"
    :class="cn(
      'bg-border shrink-0 data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px',
      props.class,
    )"
  />
</template>
