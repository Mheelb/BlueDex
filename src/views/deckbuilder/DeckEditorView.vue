<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { CheckIcon, CircleAlertIcon, CopyIcon, DownloadIcon, StarIcon } from '@lucide/vue'
import { toast } from 'vue-sonner'
import type { Card } from '@/types/card'
import { createEmptyCardFilters } from '@/types/card'
import type { DeckEntry, DeckFormat } from '@/types/deck'
import { DECK_FORMATS, DECK_FORMAT_LABELS, DECK_FORMAT_RULES } from '@/types/deck'
import { filterAndSortCards } from '@/lib/filterCards'
import { canAddCard, getDeckIssues, isDeckLegal } from '@/lib/deckValidation'
import { deckExportFilename, formatDeckExport } from '@/lib/deckExport'
import { useAuthUser } from '@/composables/useAuthUser'
import { useDeckDraft } from '@/composables/useDeckDraft'
import { cardKeys, fetchAllCardsWithSet } from '@/queries/cards'
import { collectionKeys, fetchMyCollection } from '@/queries/collection'
import { deckKeys, fetchDeckWithCards, saveDeck } from '@/queries/decks'
import CardFilters from '@/components/cards/CardFilters.vue'
import SelectField from '@/components/form/SelectField.vue'
import type { SelectFieldOption } from '@/components/form/SelectField.vue'
import DeckBuilderCardTile from '@/components/deckbuilder/DeckBuilderCardTile.vue'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import PageHeader from '@/components/common/PageHeader.vue'
import Pagination from '@/components/common/Pagination.vue'
import QueryState from '@/components/common/QueryState.vue'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

const props = defineProps<{ deckId?: string }>()

const router = useRouter()
const queryClient = useQueryClient()
const { session } = useAuthUser()
const userId = computed(() => session.value?.user.id)

const isEditing = computed(() => !!props.deckId)

const { setDraft, takeDraft } = useDeckDraft()
const draft = !props.deckId ? takeDraft() : null

const deckName = ref(draft?.name ?? 'Nouveau deck')
const format = ref<DeckFormat>(draft?.format ?? 'normal')
const isPublic = ref(false)
const entries = ref<DeckEntry[]>(draft?.entries.map((e) => ({ ...e })) ?? [])
const coverCardId = ref<string | null>(null)
const error = ref<string | null>(null)

const formatOptions: SelectFieldOption[] = DECK_FORMATS.map((f) => ({ value: f, label: DECK_FORMAT_LABELS[f] }))

const {
  data: existingDeck,
  isPending: deckLoading,
  error: deckError,
} = useQuery({
  queryKey: computed(() => deckKeys.detail(props.deckId ?? '')),
  queryFn: () => fetchDeckWithCards(props.deckId!),
  enabled: computed(() => !!props.deckId),
})

watch(
  existingDeck,
  (data) => {
    if (!data) return
    deckName.value = data.deck.name
    format.value = data.deck.format
    isPublic.value = data.deck.is_public
    entries.value = data.entries.map((e) => ({ ...e }))
    coverCardId.value = data.deck.cover_card_id
  },
  { immediate: true },
)

// La carte de couverture doit toujours faire partie du deck : si elle en est
// retirée (ou si aucune n'a encore été choisie), on retombe sur la première
// carte restante plutôt que de laisser une vignette vide.
watch(
  entries,
  (value) => {
    if (value.some((e) => e.card.id === coverCardId.value)) return
    coverCardId.value = value[0]?.card.id ?? null
  },
  { deep: true },
)

function setCover(cardId: string) {
  if (readOnly.value) return
  coverCardId.value = cardId
}

// Un deck public reste consultable par n'importe quel compte connecté, mais
// seul son propriétaire peut le modifier : tant que le deck n'est pas encore
// chargé on ne sait pas qui en est l'auteur, donc readOnly reste false pour
// ne pas afficher un formulaire éditable en clignotant avant de le verrouiller.
const isOwner = computed(() => !isEditing.value || existingDeck.value?.deck.user_id === session.value?.user.id)
const readOnly = computed(() => isEditing.value && !!existingDeck.value && !isOwner.value)

const { data: allCards, isPending: catalogueLoading } = useQuery({
  queryKey: cardKeys.allWithSet(),
  queryFn: fetchAllCardsWithSet,
})

const mobilePanel = ref<'catalogue' | 'deck'>('catalogue')

const { data: collection } = useQuery({
  queryKey: computed(() => collectionKeys.mine(userId.value ?? '')),
  queryFn: () => fetchMyCollection(userId.value!),
  enabled: computed(() => !!userId.value),
})
const collectionMap = computed(() => collection.value ?? new Map<string, number>())
const ownedOnly = ref(false)

function ownedQuantity(cardId: string) {
  return collectionMap.value.get(cardId) ?? 0
}

const filters = ref(createEmptyCardFilters())
const filteredCards = computed(() => {
  const base = filterAndSortCards(allCards.value ?? [], filters.value)
  return ownedOnly.value ? base.filter((card) => collectionMap.value.has(card.id)) : base
})

const CATALOG_PAGE_SIZE = 20
const catalogPage = ref(0)
const catalogPageCount = computed(() => Math.max(1, Math.ceil(filteredCards.value.length / CATALOG_PAGE_SIZE)))
const paginatedCards = computed(() => {
  const start = catalogPage.value * CATALOG_PAGE_SIZE
  return filteredCards.value.slice(start, start + CATALOG_PAGE_SIZE)
})

watch([filters, ownedOnly], () => {
  catalogPage.value = 0
})

function findEntry(cardId: string) {
  return entries.value.find((e) => e.card.id === cardId)
}

function quantityInDeck(cardId: string) {
  return findEntry(cardId)?.quantity
}

function exceedsOwnedQuantity(card: Card) {
  return ownedOnly.value && (quantityInDeck(card.id) ?? 0) >= ownedQuantity(card.id)
}

function isCardDisabled(card: Card) {
  return !canAddCard(entries.value, card, format.value) || exceedsOwnedQuantity(card)
}

function addCard(card: Card) {
  if (readOnly.value || !canAddCard(entries.value, card, format.value) || exceedsOwnedQuantity(card)) return
  const existing = findEntry(card.id)
  if (existing) {
    existing.quantity++
  } else {
    entries.value.push({ card, quantity: 1 })
  }
}

function removeCard(cardId: string) {
  if (readOnly.value) return
  const existing = findEntry(cardId)
  if (!existing) return
  if (existing.quantity <= 1) {
    entries.value = entries.value.filter((e) => e.card.id !== cardId)
  } else {
    existing.quantity--
  }
}

function onDrop(event: DragEvent) {
  if (readOnly.value) return
  const cardId = event.dataTransfer?.getData('text/plain')
  if (!cardId) return
  const card = allCards.value?.find((c) => c.id === cardId)
  if (card) addCard(card)
}

const deckIssues = computed(() => getDeckIssues(entries.value, format.value))
const totalCards = computed(() => entries.value.reduce((sum, e) => sum + e.quantity, 0))
const targetSize = computed(() => DECK_FORMAT_RULES[format.value].size)

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

const canSave = computed(() => !!deckName.value.trim() && isDeckLegal(entries.value, format.value))

const saveMutation = useMutation({
  mutationFn: async () => {
    if (!session.value?.user.id) throw new Error('Session expirée, reconnecte-toi.')
    const name = deckName.value.trim()
    if (!name) throw new Error('Le nom du deck est requis.')
    if (!isDeckLegal(entries.value, format.value))
      throw new Error('Le deck ne respecte pas les règles du format choisi.')

    return saveDeck(props.deckId ?? null, name, format.value, isPublic.value, coverCardId.value, entries.value)
  },
  onSuccess: (deckId) => {
    queryClient.invalidateQueries({ queryKey: deckKeys.detail(deckId) })
    queryClient.invalidateQueries({ queryKey: deckKeys.all })
    toast.success('Deck enregistré.')
    if (!props.deckId) {
      router.replace({ name: 'deck-builder-edit', params: { deckId } })
    }
  },
  onError: (err) => {
    error.value = err.message
    toast.error(err.message)
  },
})

function onSave() {
  error.value = null
  saveMutation.mutate()
}

function onDuplicate() {
  setDraft({
    name: `Copie de ${deckName.value}`,
    format: format.value,
    entries: entries.value.map((e) => ({ ...e })),
  })
  router.push({ name: 'deck-builder-new' })
}

function onExport() {
  const text = formatDeckExport(deckName.value, format.value, entries.value)
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = deckExportFilename(deckName.value)
  link.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <PageHeader :title="readOnly ? deckName : isEditing ? 'Modifier le deck' : 'Nouveau deck'" />

  <QueryState :loading="isEditing && deckLoading" :error="deckError?.message ?? null">
    <p v-if="readOnly" class="mb-4 text-sm text-muted-foreground">
      Deck public en lecture seule — seul son propriétaire peut le modifier. Duplique-le pour en créer ta propre
      version.
    </p>

    <Tabs v-model="mobilePanel" class="gap-4 lg:hidden mb-5">
      <TabsList class="w-full">
        <TabsTrigger value="catalogue" class="flex-1">Catalogue</TabsTrigger>
        <TabsTrigger value="deck" class="flex-1">Mon deck ({{ totalCards }})</TabsTrigger>
      </TabsList>
    </Tabs>

    <div class="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">
      <div :class="mobilePanel === 'catalogue' ? 'block' : 'hidden'" class="lg:block">
        <CardFilters v-model="filters" :cards="allCards" class="mb-4">
          <template v-if="userId" #extra>
            <label class="flex shrink-0 items-center gap-2 text-sm text-muted-foreground">
              <Checkbox :model-value="ownedOnly" @update:model-value="(v) => (ownedOnly = !!v)" />
              Cartes possédées uniquement
            </label>
          </template>
        </CardFilters>
        <QueryState
          :loading="catalogueLoading"
          :empty="filteredCards.length === 0"
          empty-message="Aucune carte ne correspond aux filtres."
        >
          <div class="grid grid-cols-3 gap-x-3 gap-y-6 sm:grid-cols-4 md:grid-cols-5">
            <div v-for="card in paginatedCards" :key="card.id">
              <DeckBuilderCardTile
                :card="card"
                :quantity="quantityInDeck(card.id)"
                :disabled="readOnly || isCardDisabled(card)"
                :draggable="!readOnly"
                :show-remove-action="!readOnly"
                @click="addCard(card)"
                @remove="removeCard(card.id)"
              />
              <p class="mt-1 truncate text-center text-[10px] text-muted-foreground">{{ card.set.name }}</p>
            </div>
          </div>

          <Pagination v-model:page="catalogPage" :page-count="catalogPageCount" class="mt-4" />
        </QueryState>
      </div>

      <div
        class="h-fit flex-col gap-4 rounded-xl border bg-card p-4 lg:flex"
        :class="mobilePanel === 'deck' ? 'flex' : 'hidden'"
        @dragover.prevent
        @drop="onDrop"
      >
        <Input v-model="deckName" placeholder="Nom du deck" :disabled="readOnly" />
        <SelectField v-model="format" :options="formatOptions" :disabled="readOnly" />
        <label class="flex items-center gap-2 text-sm">
          <Checkbox :model-value="isPublic" :disabled="readOnly" @update:model-value="(v) => (isPublic = !!v)" />
          public
          <span class="text-xs text-muted-foreground">— visible et duplicable par les autres joueurs</span>
        </label>
        <p class="text-sm text-muted-foreground">{{ totalCards }} / {{ targetSize }} cartes</p>

        <div
          v-if="entries.length === 0"
          class="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground"
        >
          Glisse ou clique sur une carte du catalogue pour l'ajouter.
        </div>
        <div v-else class="grid grid-cols-3 gap-3">
          <DeckBuilderCardTile
            v-for="entry in entries"
            :key="entry.card.id"
            :card="entry.card"
            :quantity="entry.quantity"
            :show-cover-action="!readOnly"
            :is-cover="entry.card.id === coverCardId"
            @click="removeCard(entry.card.id)"
            @set-cover="setCover(entry.card.id)"
          />
        </div>
        <p v-if="coverCardId" class="text-xs text-muted-foreground">
          <StarIcon class="inline size-3 align-text-top" />
          définit la carte de couverture affichée dans les listes de decks.
        </p>

        <div class="flex flex-col gap-1 text-sm">
          <div
            v-for="issue in deckIssues"
            :key="issue.key"
            class="flex items-center gap-2"
            :class="issue.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'"
          >
            <CheckIcon v-if="issue.ok" class="size-4 shrink-0" />
            <CircleAlertIcon v-else class="size-4 shrink-0" />
            {{ issue.label }}
          </div>
        </div>

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
          <div v-for="[type, count] in typeBreakdown" :key="type" class="flex items-center justify-between">
            <span>{{ type }}</span>
            <span class="text-muted-foreground">{{ count }}</span>
          </div>
        </div>

        <Button v-if="entries.length > 0" variant="outline" @click="onExport">
          <DownloadIcon />
          Exporter
        </Button>

        <template v-if="readOnly">
          <Button variant="outline" @click="onDuplicate">
            <CopyIcon />
            Dupliquer
          </Button>
        </template>
        <template v-else>
          <p v-if="error" class="text-sm text-destructive">{{ error }}</p>
          <Button :disabled="saveMutation.isPending.value || !canSave" @click="onSave">
            {{ saveMutation.isPending.value ? 'Enregistrement...' : 'Enregistrer' }}
          </Button>
        </template>
      </div>
    </div>
  </QueryState>
</template>
