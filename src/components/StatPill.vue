<script setup lang="ts">
const colors = {
  primary: 'bg-primary text-primary-foreground',
  power: 'bg-[#E6003E] text-white',
  support: 'bg-[#0097AF] text-white',
} as const

defineProps<{
  value: number
  label: string
  color: keyof typeof colors
}>()
</script>

<template>
  <div class="flex flex-col items-center gap-1.5">
    <div :class="['flex size-10 items-center justify-center rounded-full text-sm font-bold', colors[color]]">
      {{ value }}
    </div>
    <span class="text-xs text-muted-foreground">{{ label }}</span>
  </div>
</template>
