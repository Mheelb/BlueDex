<script setup lang="ts">
import { LayersIcon } from '@lucide/vue'
import type { SetCollectionProgress } from '@/types/collection'
import { cdnImage } from '@/lib/imageCdn'

const props = defineProps<{ progress: SetCollectionProgress }>()

const percent = props.progress.total > 0 ? Math.round((props.progress.owned / props.progress.total) * 100) : 0
</script>

<template>
  <RouterLink
    :to="{ name: 'set', params: { setSlug: progress.set.slug } }"
    class="group flex items-center gap-4 rounded-xl border bg-card p-4 transition-colors hover:border-primary/50"
  >
    <div
      class="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-primary to-primary/70"
    >
      <img
        v-if="progress.set.logo_url || progress.set.symbol_url"
        :src="cdnImage(progress.set.logo_url ?? progress.set.symbol_url, 96)"
        :alt="progress.set.name"
        class="max-h-[70%] max-w-[70%] object-contain"
      />
      <LayersIcon v-else class="size-6 text-primary-foreground/50" />
    </div>

    <div class="min-w-0 flex-1">
      <p class="truncate font-medium group-hover:text-primary">{{ progress.set.name }}</p>
      <div class="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div class="h-full rounded-full bg-primary transition-all" :style="{ width: `${percent}%` }" />
      </div>
    </div>

    <p class="shrink-0 text-sm text-muted-foreground">{{ progress.owned }} / {{ progress.total }}</p>
  </RouterLink>
</template>
