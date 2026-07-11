<script setup lang="ts">
import Heading from '@/components/common/Heading.vue'
import { Separator } from '@/components/ui/separator'

defineProps<{
  eyebrow: string
  title: string
  description?: string
}>()
</script>

<template>
  <div class="mb-10">
    <div class="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p class="font-engraved text-sm font-semibold tracking-wide text-primary uppercase">{{ eyebrow }}</p>
        <Heading size="hero" class="mt-2">{{ title }}</Heading>
        <p v-if="description" class="mt-3 max-w-xl text-muted-foreground">{{ description }}</p>
        <div v-if="$slots.default" class="mt-5 flex flex-wrap gap-2">
          <slot />
        </div>
      </div>
      <div v-if="$slots.actions" class="shrink-0">
        <slot name="actions" />
      </div>
    </div>
    <Separator ornament class="mt-8" />
  </div>
</template>
