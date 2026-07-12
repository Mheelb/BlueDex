<script setup lang="ts">
import { computed } from 'vue'
import { useVueTable, getCoreRowModel, type ColumnDef, type Updater, type PaginationState } from '@tanstack/vue-table'
import { BookmarkIcon, ChevronLeftIcon, ChevronRightIcon, LayersIcon } from '@lucide/vue'
import type { DeckFormat } from '@/types/deck'
import type { DeckListItem } from '@/types/deck'
import { DECK_FORMAT_LABELS } from '@/types/deck'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import QueryState from '@/components/common/QueryState.vue'
import BrandStar from '@/components/common/BrandStar.vue'

const props = defineProps<{
  rows: DeckListItem[]
  loading?: boolean
  error?: string | null
  pageIndex: number
  pageSize: number
  pageCount: number
  showAuthor?: boolean
  bookmarkedIds: Set<string>
  starredIds: Set<string>
  currentUserId?: string
  emptyMessage: string
}>()

const emit = defineEmits<{
  'update:pageIndex': [value: number]
  'toggle-bookmark': [deckId: string]
  'toggle-star': [deckId: string]
}>()

function starTitle(deck: DeckListItem) {
  if (deck.user_id === props.currentUserId) return 'Tu ne peux pas voter pour ton propre deck.'
  return props.starredIds.has(deck.id) ? 'Retirer ta Blue Star' : 'Donner une Blue Star'
}

const FORMAT_BADGE_VARIANT: Record<DeckFormat, 'default' | 'outline'> = {
  normal: 'default',
  rapide: 'outline',
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

// Colonnes minimales : la liste est rendue en cartes (pas en <table>), mais
// on garde TanStack Table pour la gestion des lignes/pagination.
const columns: ColumnDef<DeckListItem>[] = [
  { accessorKey: 'id' },
  { accessorKey: 'name' },
  { accessorKey: 'format' },
  { accessorKey: 'star_count' },
  { accessorKey: 'updated_at' },
  { accessorKey: 'user_id' },
]

const table = useVueTable({
  data: computed(() => props.rows),
  columns,
  manualPagination: true,
  get pageCount() {
    return props.pageCount
  },
  state: {
    get pagination(): PaginationState {
      return { pageIndex: props.pageIndex, pageSize: props.pageSize }
    },
  },
  onPaginationChange: (updater: Updater<PaginationState>) => {
    const current = { pageIndex: props.pageIndex, pageSize: props.pageSize }
    const next = typeof updater === 'function' ? updater(current) : updater
    emit('update:pageIndex', next.pageIndex)
  },
  getCoreRowModel: getCoreRowModel(),
})
</script>

<template>
  <QueryState :loading="loading" :error="error" :empty="!loading && rows.length === 0" :empty-message="emptyMessage">
    <div class="flex flex-col gap-2">
      <div
        v-for="row in table.getRowModel().rows"
        :key="row.id"
        class="flex items-center gap-4 rounded-2xl border bg-card p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
      >
        <div
          class="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-secondary text-primary"
        >
          <img
            v-if="row.original.cover_card?.image_url"
            :src="row.original.cover_card.image_url"
            :alt="row.original.cover_card.name"
            class="h-full w-full object-cover"
            :class="{ 'ring-2 ring-primary': row.original.cover_card.is_holo }"
          />
          <LayersIcon v-else class="size-5" />
        </div>

        <div class="min-w-0 flex-1">
          <RouterLink
            :to="{ name: 'deck-builder-edit', params: { deckId: row.original.id } }"
            class="truncate font-medium hover:underline"
          >
            {{ row.original.name }}
          </RouterLink>

          <div class="mt-1.5 flex flex-wrap items-center gap-2">
            <Badge :variant="FORMAT_BADGE_VARIANT[row.original.format]">
              {{ DECK_FORMAT_LABELS[row.original.format] }}
            </Badge>
            <button
              type="button"
              class="flex items-center gap-1 rounded-full px-1.5 py-0.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              :class="starredIds.has(row.original.id) ? 'text-[#2e6bff]' : 'text-muted-foreground hover:text-[#2e6bff]'"
              :disabled="row.original.user_id === currentUserId"
              :title="starTitle(row.original)"
              @click="emit('toggle-star', row.original.id)"
            >
              <BrandStar class="size-10 cursor-pointer" />
              {{ row.original.star_count }}
            </button>
            <span class="text-xs text-muted-foreground">Mis à jour le {{ formatDate(row.original.updated_at) }}</span>
          </div>
        </div>

        <div v-if="showAuthor && row.original.author" class="flex shrink-0 items-center gap-2">
          <Avatar class="size-6">
            <AvatarImage v-if="row.original.author.avatar_url" :src="row.original.author.avatar_url" />
            <AvatarFallback class="text-[10px]">{{
              row.original.author.display_name.slice(0, 2).toUpperCase()
            }}</AvatarFallback>
          </Avatar>
          <span class="text-sm text-muted-foreground">{{ row.original.author.display_name }}</span>
        </div>

        <Button
          variant="ghost"
          size="icon"
          class="shrink-0 hover:bg-primary/10"
          :class="bookmarkedIds.has(row.original.id) ? 'text-primary' : 'text-muted-foreground'"
          :title="bookmarkedIds.has(row.original.id) ? 'Retirer le bookmark' : 'Bookmarker'"
          @click="emit('toggle-bookmark', row.original.id)"
        >
          <BookmarkIcon :fill="bookmarkedIds.has(row.original.id) ? 'currentColor' : 'none'" />
        </Button>
      </div>
    </div>

    <div v-if="pageCount > 1" class="mt-3 flex items-center justify-center gap-3">
      <Button
        variant="outline"
        size="icon"
        :disabled="pageIndex === 0"
        @click="emit('update:pageIndex', pageIndex - 1)"
      >
        <ChevronLeftIcon />
      </Button>
      <span class="text-sm text-muted-foreground">Page {{ pageIndex + 1 }} / {{ pageCount }}</span>
      <Button
        variant="outline"
        size="icon"
        :disabled="pageIndex >= pageCount - 1"
        @click="emit('update:pageIndex', pageIndex + 1)"
      >
        <ChevronRightIcon />
      </Button>
    </div>
  </QueryState>
</template>
