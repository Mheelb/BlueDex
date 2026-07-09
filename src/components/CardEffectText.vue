<script setup lang="ts">
import { computed } from 'vue'
import { CARD_SYMBOLS, parseCardEffect } from '@/lib/cardSymbols'

const props = defineProps<{ text: string }>()

const parts = computed(() => parseCardEffect(props.text))
</script>

<template>
  <p class="text-sm whitespace-pre-line">
    <template v-for="(part, index) in parts" :key="index">
      <img
        v-if="part.type === 'symbol'"
        :src="CARD_SYMBOLS[part.value]"
        :alt="part.value"
        class="inline-block h-5 w-5 -translate-y-0.5 align-middle"
      />
      <template v-else>{{ part.value }}</template>
    </template>
  </p>
</template>
