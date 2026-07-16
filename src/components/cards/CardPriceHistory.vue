<script setup lang="ts">
import { computed, ref } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { priceKeys, fetchPriceHistory } from '@/queries/prices'
import { aggregateWeeklyMedian } from '@/lib/priceAggregation'

const props = defineProps<{ cardId: string }>()

const { data: listings, isPending } = useQuery({
  queryKey: computed(() => priceKeys.history(props.cardId)),
  queryFn: () => fetchPriceHistory(props.cardId),
})

const points = computed(() => aggregateWeeklyMedian(listings.value ?? []))

const WIDTH = 560
const HEIGHT = 200
const PADDING_X = 12
const PADDING_Y = 24
const INNER_WIDTH = WIDTH - PADDING_X * 2
const INNER_HEIGHT = HEIGHT - PADDING_Y * 2

function formatWeek(weekStart: string) {
  return new Date(weekStart).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

function formatPrice(value: number) {
  return `${value.toFixed(2).replace('.', ',')} €`
}

const chart = computed(() => {
  if (points.value.length === 0) return null

  const prices = points.value.map((p) => p.median)
  const minPrice = Math.min(...prices)
  const maxPrice = Math.max(...prices)
  const priceRange = maxPrice - minPrice || 1

  const xForIndex = (i: number) =>
    points.value.length === 1 ? PADDING_X + INNER_WIDTH / 2 : PADDING_X + (i / (points.value.length - 1)) * INNER_WIDTH
  const yForPrice = (price: number) => PADDING_Y + INNER_HEIGHT - ((price - minPrice) / priceRange) * INNER_HEIGHT

  const coords = points.value.map((p, i) => ({ ...p, x: xForIndex(i), y: yForPrice(p.median) }))
  const linePath = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' ')

  const gridLines = [minPrice, (minPrice + maxPrice) / 2, maxPrice].map((price) => ({
    price,
    y: yForPrice(price),
  }))

  const last = coords[coords.length - 1]

  return { coords, linePath, gridLines, minPrice, maxPrice, last }
})

const hoverIndex = ref<number | null>(null)

function onPointerMove(event: PointerEvent) {
  if (!chart.value || chart.value.coords.length === 0) return
  const svg = event.currentTarget as SVGSVGElement
  const rect = svg.getBoundingClientRect()
  const pointerX = ((event.clientX - rect.left) / rect.width) * WIDTH

  let closestIndex = 0
  let closestDistance = Infinity
  chart.value.coords.forEach((c, i) => {
    const distance = Math.abs(c.x - pointerX)
    if (distance < closestDistance) {
      closestDistance = distance
      closestIndex = i
    }
  })
  hoverIndex.value = closestIndex
}

function onPointerLeave() {
  hoverIndex.value = null
}

const hovered = computed(() => (chart.value && hoverIndex.value !== null ? chart.value.coords[hoverIndex.value] : null))
</script>

<template>
  <div class="rounded-lg border bg-card p-4">
    <p class="mb-3 text-sm font-medium text-muted-foreground">Prix de la carte</p>

    <p v-if="isPending" class="text-sm text-muted-foreground">Chargement…</p>
    <p v-else-if="!chart" class="text-sm text-muted-foreground">Pas encore de données de prix.</p>

    <div v-else class="relative">
      <svg
        :viewBox="`0 0 ${WIDTH} ${HEIGHT}`"
        class="w-full cursor-crosshair"
        role="img"
        :aria-label="`Courbe de prix médian hebdomadaire, de ${formatPrice(chart.minPrice)} à ${formatPrice(chart.maxPrice)}`"
        @pointermove="onPointerMove"
        @pointerleave="onPointerLeave"
      >
        <line
          v-for="line in chart.gridLines"
          :key="line.price"
          :x1="PADDING_X"
          :x2="WIDTH - PADDING_X"
          :y1="line.y"
          :y2="line.y"
          stroke="var(--border)"
          stroke-width="1"
        />
        <text
          v-for="line in chart.gridLines"
          :key="`label-${line.price}`"
          :x="WIDTH - PADDING_X"
          :y="line.y - 4"
          text-anchor="end"
          class="fill-muted-foreground text-[9px]"
        >
          {{ formatPrice(line.price) }}
        </text>

        <line
          v-if="hovered"
          :x1="hovered.x"
          :x2="hovered.x"
          :y1="PADDING_Y"
          :y2="HEIGHT - PADDING_Y"
          stroke="var(--border)"
          stroke-width="1"
        />

        <path
          :d="chart.linePath"
          fill="none"
          stroke="var(--color-primary)"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />

        <circle
          v-for="(c, i) in chart.coords"
          :key="c.weekStart"
          :cx="c.x"
          :cy="c.y"
          :r="hoverIndex === i ? 5 : 4"
          fill="var(--color-primary)"
          stroke="var(--card)"
          stroke-width="2"
        />

        <text
          :x="chart.last.x"
          :y="chart.last.y - 10"
          text-anchor="end"
          class="fill-foreground text-[10px] font-medium"
        >
          {{ formatPrice(chart.last.median) }}
        </text>

        <text :x="chart.coords[0].x" :y="HEIGHT - 4" text-anchor="start" class="fill-muted-foreground text-[9px]">
          {{ formatWeek(chart.coords[0].weekStart) }}
        </text>
        <text :x="chart.last.x" :y="HEIGHT - 4" text-anchor="end" class="fill-muted-foreground text-[9px]">
          {{ formatWeek(chart.last.weekStart) }}
        </text>
      </svg>

      <div
        v-if="hovered"
        class="pointer-events-none absolute top-0 -translate-x-1/2 rounded-md border bg-popover px-2 py-1 text-xs whitespace-nowrap text-popover-foreground shadow-sm"
        :style="{ left: `${(hovered.x / WIDTH) * 100}%` }"
      >
        <p class="font-medium">{{ formatPrice(hovered.median) }}</p>
        <p class="text-muted-foreground">
          {{ formatWeek(hovered.weekStart) }} · {{ hovered.count }} annonce{{ hovered.count > 1 ? 's' : '' }}
        </p>
      </div>

      <ul class="sr-only">
        <li v-for="c in chart.coords" :key="`sr-${c.weekStart}`">
          Semaine du {{ formatWeek(c.weekStart) }} : prix médian {{ formatPrice(c.median) }} sur {{ c.count }} annonce{{
            c.count > 1 ? 's' : ''
          }}
        </li>
      </ul>
    </div>
  </div>
</template>
