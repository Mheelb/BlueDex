<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useQuery } from '@tanstack/vue-query'
import { toast } from 'vue-sonner'
import { CopyIcon, DownloadIcon, PencilIcon, Share2Icon } from '@lucide/vue'
import { DECK_FORMAT_LABELS, DECK_FORMAT_RULES } from '@/types/deck'
import { deckExportFilename, formatDeckExport } from '@/lib/deckExport'
import { SITE_URL, absoluteUrl, usePageSeo, useJsonLd } from '@/lib/seo'
import { useAuthUser } from '@/composables/useAuthUser'
import { useDeckDraft } from '@/composables/useDeckDraft'
import { deckKeys, fetchDeckDetail } from '@/queries/decks'
import { cdnImage } from '@/lib/imageCdn'
import DeckBuilderCardTile from '@/components/deckbuilder/DeckBuilderCardTile.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import QueryState from '@/components/common/QueryState.vue'
import BrandStar from '@/components/common/BrandStar.vue'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

const props = defineProps<{ deckId: string }>()

const router = useRouter()
const { session } = useAuthUser()
const { setDraft } = useDeckDraft()

const {
  data: detail,
  isPending,
  error,
} = useQuery({
  queryKey: computed(() => deckKeys.detail(props.deckId)),
  queryFn: () => fetchDeckDetail(props.deckId),
})

const deck = computed(() => detail.value?.deck ?? null)
const entries = computed(() => detail.value?.entries ?? [])
const author = computed(() => detail.value?.author ?? null)

const isOwner = computed(() => !!deck.value && deck.value.user_id === session.value?.user.id)
const deckName = computed(() => deck.value?.name ?? 'Deck')
const totalCards = computed(() => entries.value.reduce((sum, e) => sum + e.quantity, 0))
const targetSize = computed(() => (deck.value ? DECK_FORMAT_RULES[deck.value.format].size : 0))

const coverImage = computed(() => {
  const cover = entries.value.find((e) => e.card.id === deck.value?.cover_card_id)
  const url = cover?.card.image_url ?? entries.value[0]?.card.image_url
  return url ? absoluteUrl(url) : undefined
})

const description = computed(() =>
  deck.value
    ? `Deck ${DECK_FORMAT_LABELS[deck.value.format]} Blue Rising${author.value ? ` par ${author.value.display_name}` : ''} — ${totalCards.value} cartes. Découvre la liste complète sur BlueDex.`
    : undefined,
)

usePageSeo({
  title: () => (deck.value ? `${deckName.value} — Deck Blue Rising` : undefined),
  description,
  path: () => `/decks/${props.deckId}`,
  image: coverImage,
})

useJsonLd(() =>
  deck.value
    ? {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Accueil', item: SITE_URL },
          { '@type': 'ListItem', position: 2, name: 'Deck Builder', item: `${SITE_URL}/decks` },
          { '@type': 'ListItem', position: 3, name: deckName.value, item: `${SITE_URL}/decks/${props.deckId}` },
        ],
      }
    : null,
)

const costCurve = computed(() => {
  const buckets = new Map<number, number>()
  for (const e of entries.value) {
    const cost = e.card.cost ?? 0
    buckets.set(cost, (buckets.get(cost) ?? 0) + e.quantity)
  }
  return [...buckets.entries()].sort((a, b) => a[0] - b[0])
})
const maxCostCount = computed(() => Math.max(1, ...costCurve.value.map(([, count]) => count)))

const typeBreakdown = computed(() => {
  const buckets = new Map<string, number>()
  for (const e of entries.value) {
    const type = e.card.type ?? 'Autre'
    buckets.set(type, (buckets.get(type) ?? 0) + e.quantity)
  }
  return [...buckets.entries()]
})

async function onShare() {
  const url = `${SITE_URL}/decks/${props.deckId}`
  try {
    await navigator.clipboard.writeText(url)
    toast.success('Lien du deck copié !')
  } catch {
    toast.error('Impossible de copier le lien.')
  }
}

function onExport() {
  if (!deck.value) return
  const text = formatDeckExport(deck.value.name, deck.value.format, entries.value)
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = deckExportFilename(deck.value.name)
  link.click()
  URL.revokeObjectURL(url)
}

function onDuplicate() {
  if (!deck.value) return
  if (!session.value) {
    router.push({ name: 'login', query: { redirect: `/decks/${props.deckId}` } })
    return
  }
  setDraft({
    name: `Copie de ${deck.value.name}`,
    format: deck.value.format,
    entries: entries.value.map((e) => ({ ...e })),
  })
  router.push({ name: 'deck-builder-new' })
}
</script>

<template>
  <QueryState :loading="isPending" :error="error?.message ?? null">
    <template v-if="deck">
      <PageHeader :title="deckName" />

      <div class="mt-2 mb-6 flex flex-wrap items-center gap-3">
        <Badge :variant="deck.format === 'normal' ? 'default' : 'outline'">
          {{ DECK_FORMAT_LABELS[deck.format] }}
        </Badge>
        <span class="flex items-center gap-1 text-sm text-muted-foreground">
          <BrandStar class="size-9" />
          {{ deck.star_count }}
        </span>
        <span class="text-sm text-muted-foreground">{{ totalCards }} / {{ targetSize }} cartes</span>
        <div v-if="author" class="flex items-center gap-2">
          <Avatar class="size-6">
            <AvatarImage v-if="author.avatar_url" :src="cdnImage(author.avatar_url, 96)!" />
            <AvatarFallback class="text-[10px]">{{ author.display_name.slice(0, 2).toUpperCase() }}</AvatarFallback>
          </Avatar>
          <span class="text-sm text-muted-foreground">{{ author.display_name }}</span>
        </div>
      </div>

      <div class="mb-6 flex flex-wrap gap-2">
        <Button v-if="deck.is_public" variant="outline" @click="onShare">
          <Share2Icon />
          Partager
        </Button>
        <Button variant="outline" @click="onExport">
          <DownloadIcon />
          Exporter
        </Button>
        <Button variant="outline" @click="onDuplicate">
          <CopyIcon />
          Dupliquer
        </Button>
        <Button v-if="isOwner" as-child variant="outline">
          <RouterLink :to="{ name: 'deck-builder-edit', params: { deckId: props.deckId } }">
            <PencilIcon />
            Modifier
          </RouterLink>
        </Button>
      </div>

      <p
        v-if="isOwner && !deck.is_public"
        class="mb-6 rounded-lg border border-dashed p-3 text-sm text-muted-foreground"
      >
        Ce deck est privé — rends-le public depuis l'éditeur pour pouvoir le partager avec la communauté.
      </p>

      <div class="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
        <div>
          <div class="grid grid-cols-3 gap-x-3 gap-y-6 sm:grid-cols-4 md:grid-cols-5">
            <DeckBuilderCardTile
              v-for="entry in entries"
              :key="entry.card.id"
              :card="entry.card"
              :quantity="entry.quantity"
            />
          </div>
        </div>

        <div class="flex h-fit flex-col gap-4 rounded-xl border bg-card p-4">
          <div v-if="costCurve.length > 0" class="flex flex-col gap-2">
            <p class="text-xs font-medium text-muted-foreground">Courbe de coût</p>
            <div class="flex gap-1">
              <div v-for="[cost, count] in costCurve" :key="cost" class="flex flex-1 flex-col items-center gap-1">
                <div class="flex h-16 w-full items-end">
                  <div class="w-full rounded-t bg-primary" :style="{ height: `${(count / maxCostCount) * 100}%` }" />
                </div>
                <span class="text-[10px] text-muted-foreground">{{ cost }}</span>
              </div>
            </div>
          </div>

          <div v-if="typeBreakdown.length > 0" class="flex flex-col gap-1 text-xs">
            <p class="text-xs font-medium text-muted-foreground">Répartition par type</p>
            <div v-for="[type, count] in typeBreakdown" :key="type" class="flex items-center justify-between">
              <span>{{ type }}</span>
              <span class="text-muted-foreground">{{ count }}</span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </QueryState>
</template>
