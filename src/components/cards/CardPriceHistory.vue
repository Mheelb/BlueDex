<script setup lang="ts">
import { computed, ref } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { InfoIcon } from '@lucide/vue'
import { priceKeys, fetchPriceSnapshots } from '@/queries/prices'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

const props = defineProps<{ cardId: string }>()

const { data: snapshots, isPending } = useQuery({
  queryKey: computed(() => priceKeys.snapshots(props.cardId)),
  queryFn: () => fetchPriceSnapshots(props.cardId),
})

const points = computed(() =>
  (snapshots.value ?? []).map((s) => ({ date: s.snapshot_date, median: s.median_price, count: s.listing_count })),
)

const WIDTH = 560
const HEIGHT = 200
const PADDING_X = 12
const PADDING_Y = 24
// Marge sous le prix le plus bas : évite que la courbe et son étiquette se superposent
// quand le prix reste au minimum, et laisse respirer le dégradé.
const BOTTOM_GAP = 28
const INNER_WIDTH = WIDTH - PADDING_X * 2
const INNER_HEIGHT = HEIGHT - PADDING_Y * 2 - BOTTOM_GAP

const gradientId = computed(() => `price-area-${props.cardId.replace(/[^a-zA-Z0-9_-]/g, '')}`)

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
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

  const baseline = HEIGHT - PADDING_Y
  const first = coords[0]
  const lastCoord = coords[coords.length - 1]
  const areaPath = `${linePath} L ${lastCoord.x.toFixed(1)} ${baseline} L ${first.x.toFixed(1)} ${baseline} Z`

  // Si le prix ne bouge pas, les trois repères se confondent : on n'en garde qu'un.
  const gridPrices =
    maxPrice - minPrice < 0.005 ? [minPrice] : [minPrice, (minPrice + maxPrice) / 2, maxPrice]
  const lastLabelY = lastCoord.y - 10
  const gridLines = gridPrices.map((price) => {
    const y = yForPrice(price)
    // L'étiquette du minimum passe sous sa ligne, sinon elle chevauche la courbe
    // qui longe ce même niveau.
    const labelY = price === minPrice ? y + 12 : y - 4
    // Les repères partagent la colonne de droite avec l'étiquette du dernier prix :
    // on masque celui qui tomberait dessus.
    return { price, y, labelY, showLabel: Math.abs(labelY - lastLabelY) > 10 }
  })

  return { coords, linePath, areaPath, gridLines, minPrice, maxPrice, last: lastCoord }
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
    <TooltipProvider :delay-duration="200">
      <div class="mb-3 flex items-center gap-1.5">
        <p class="text-sm font-medium text-muted-foreground">Prix de la carte</p>
        <Tooltip>
          <TooltipTrigger as-child>
            <button type="button" aria-label="À propos de ces prix" class="text-muted-foreground hover:text-foreground">
              <InfoIcon class="size-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" class="max-w-64 text-pretty whitespace-normal">
            Ces prix correspondent à des annonces publiées, pas à des ventes confirmées, et peuvent donc être sujets à
            manipulation. Ils sont fournis à titre indicatif : il est recommandé de vérifier les prix par soi-même avant
            tout achat. Mise à jour quotidienne vers 5h du matin (heure de Paris, CET/CEST).
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>

    <p v-if="isPending" class="text-sm text-muted-foreground">Chargement…</p>
    <p v-else-if="!chart" class="text-sm text-muted-foreground">Pas encore de données de prix.</p>

    <div v-else class="relative">
      <svg
        :viewBox="`0 0 ${WIDTH} ${HEIGHT}`"
        class="w-full cursor-crosshair"
        role="img"
        :aria-label="`Courbe de prix médian journalier, de ${formatPrice(chart.minPrice)} à ${formatPrice(chart.maxPrice)}`"
        @pointermove="onPointerMove"
        @pointerleave="onPointerLeave"
      >
        <defs>
          <linearGradient :id="gradientId" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="var(--color-primary)" stop-opacity="0.28" />
            <stop offset="100%" stop-color="var(--color-primary)" stop-opacity="0" />
          </linearGradient>
        </defs>

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
          v-for="line in chart.gridLines.filter((l) => l.showLabel)"
          :key="`label-${line.price}`"
          :x="WIDTH - PADDING_X"
          :y="line.labelY"
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

        <path :d="chart.areaPath" :fill="`url(#${gradientId})`" stroke="none" />

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
          :key="c.date"
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
          {{ formatDate(chart.coords[0].date) }}
        </text>
        <text :x="chart.last.x" :y="HEIGHT - 4" text-anchor="end" class="fill-muted-foreground text-[9px]">
          {{ formatDate(chart.last.date) }}
        </text>
      </svg>

      <div
        v-if="hovered"
        class="pointer-events-none absolute top-0 -translate-x-1/2 rounded-md border bg-popover px-2 py-1 text-xs whitespace-nowrap text-popover-foreground shadow-sm"
        :style="{ left: `${(hovered.x / WIDTH) * 100}%` }"
      >
        <p class="font-medium">{{ formatPrice(hovered.median) }}</p>
        <p class="text-muted-foreground">
          {{ formatDate(hovered.date) }} · {{ hovered.count }} annonce{{ hovered.count > 1 ? 's' : '' }}
        </p>
      </div>

      <ul class="sr-only">
        <li v-for="c in chart.coords" :key="`sr-${c.date}`">
          {{ formatDate(c.date) }} : prix médian {{ formatPrice(c.median) }} sur {{ c.count }} annonce{{
            c.count > 1 ? 's' : ''
          }}
        </li>
      </ul>
    </div>
  </div>
</template>
