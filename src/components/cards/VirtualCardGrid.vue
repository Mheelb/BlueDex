<script setup lang="ts">
import { computed, onMounted, onUpdated, ref, shallowRef, watch } from 'vue'
import { useWindowVirtualizer } from '@tanstack/vue-virtual'
import { useWindowSize } from '@vueuse/core'
import type { Card } from '@/types/card'
import { chunk } from '@/lib/utils'
import { useCardGridColumns } from '@/composables/useCardGridColumns'

const props = defineProps<{ cards: Card[] }>()

defineSlots<{
  default(props: { card: Card }): unknown
}>()

const columns = useCardGridColumns()
const cardRows = computed(() => chunk(props.cards, columns.value))

const gridRef = ref<HTMLElement | null>(null)
const gridOffsetTop = ref(0)
const { width: windowWidth } = useWindowSize()

watch([gridRef, windowWidth], () => {
  gridOffsetTop.value = gridRef.value?.offsetTop ?? 0
})

const rowVirtualizerOptions = computed(() => ({
  count: cardRows.value.length,
  estimateSize: () => 340,
  overscan: 3,
  scrollMargin: gridOffsetTop.value,
}))

const rowVirtualizer = useWindowVirtualizer(rowVirtualizerOptions)
const virtualRows = computed(() => rowVirtualizer.value.getVirtualItems())
const totalSize = computed(() => rowVirtualizer.value.getTotalSize())

const rowEls = shallowRef<HTMLElement[]>([])

function measureRows() {
  for (const el of rowEls.value) {
    if (el) rowVirtualizer.value.measureElement(el)
  }
}

onMounted(measureRows)
onUpdated(measureRows)
</script>

<template>
  <div ref="gridRef" :style="{ height: `${totalSize}px`, position: 'relative' }">
    <div
      :style="{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        transform: `translateY(${(virtualRows[0]?.start ?? 0) - rowVirtualizer.options.scrollMargin}px)`,
      }"
    >
      <div
        v-for="virtualRow in virtualRows"
        :key="String(virtualRow.key)"
        ref="rowEls"
        :data-index="virtualRow.index"
        class="grid grid-cols-2 gap-x-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7"
        :class="virtualRow.index < cardRows.length - 1 ? 'pb-8' : ''"
      >
        <template v-for="card in cardRows[virtualRow.index]" :key="card.id">
          <slot :card="card" />
        </template>
      </div>
    </div>
  </div>
</template>
