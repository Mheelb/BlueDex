<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'
import { ArrowLeftIcon } from '@lucide/vue'
import { Button } from '@/components/ui/button'

defineProps<{
  to: RouteLocationRaw
  label: string
}>()
</script>

<template>
  <Button as-child variant="ghost" size="sm" class="-ml-2.5 text-muted-foreground hover:text-foreground">
    <RouterLink :to="to">
      <ArrowLeftIcon />
      {{ label }}
    </RouterLink>
  </Button>
</template>
