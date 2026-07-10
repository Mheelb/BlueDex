<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { CheckIcon, CircleAlertIcon } from '@lucide/vue'
import { toast } from 'vue-sonner'
import type { Card } from '@/types/card'
import { createEmptyCardFilters } from '@/types/card'
import type { DeckEntry, DeckFormat } from '@/types/deck'
import { DECK_FORMATS, DECK_FORMAT_LABELS, DECK_FORMAT_RULES } from '@/types/deck'
import { filterAndSortCards } from '@/lib/filterCards'
import { canAddCard, getDeckIssues, isDeckLegal } from '@/lib/deckValidation'
import { useAuthUser } from '@/composables/useAuthUser'
import { cardKeys, fetchAllCardsWithSet } from '@/queries/cards'
import { deckKeys, fetchDeckWithCards, saveDeck } from '@/queries/decks'
import CardFilters from '@/components/CardFilters.vue'
import SelectField from '@/components/SelectField.vue'
import type { SelectFieldOption } from '@/components/SelectField.vue'
import DeckBuilderCardTile from '@/components/deckbuilder/DeckBuilderCardTile.vue'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import PageHeader from '@/components/PageHeader.vue'
import QueryState from '@/components/QueryState.vue'

const props = defineProps<{ deckId?: string }>()

const router = useRouter()
const queryClient = useQueryClient()
const { session } = useAuthUser()

const isEditing = computed(() => !!props.deckId)

const deckName = ref('Nouveau deck')
const format = ref<DeckFormat>('normal')
const entries = ref<DeckEntry[]>([])
const error = ref<string | null>(null)

const formatOptions: SelectFieldOption[] = DECK_FORMATS.map((f) => ({ value: f, label: DECK_FORMAT_LABELS[f] }))

const { data: existingDeck, isPending: deckLoading, error: deckError } = useQuery({
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
    entries.value = data.entries.map((e) => ({ ...e }))
  },
  { immediate: true },
)

const { data: allCards, isPending: catalogueLoading } = useQuery({
  queryKey: cardKeys.allWithSet(),
  queryFn: fetchAllCardsWithSet,
})

const filters = ref(createEmptyCardFilters())
const filteredCards = computed(() => filterAndSortCards(allCards.value ?? [], filters.value))

function findEntry(cardId: string) {
  return entries.value.find((e) => e.card.id === cardId)
}

function quantityInDeck(cardId: string) {
  return findEntry(cardId)?.quantity
}

function isCardDisabled(card: Card) {
  return !canAddCard(entries.value, card, format.value)
}

function addCard(card: Card) {
  if (!canAddCard(entries.value, card, format.value)) return
  const existing = findEntry(card.id)
  if (existing) {
    existing.quantity++
  } else {
    entries.value.push({ card, quantity: 1 })
  }
}

function removeCard(cardId: string) {
  const existing = findEntry(cardId)
  if (!existing) return
  if (existing.quantity <= 1) {
    entries.value = entries.value.filter((e) => e.card.id !== cardId)
  } else {
    existing.quantity--
  }
}

function onDrop(event: DragEvent) {
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
    if (!isDeckLegal(entries.value, format.value)) throw new Error('Le deck ne respecte pas les règles du format choisi.')

    return saveDeck(props.deckId ?? null, name, format.value, entries.value)
  },
  onSuccess: (deckId) => {
    queryClient.invalidateQueries({ queryKey: deckKeys.detail(deckId) })
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
</script>

<template>
  <PageHeader :title="isEditing ? 'Modifier le deck' : 'Nouveau deck'" />

  <QueryState :loading="isEditing && deckLoading" :error="deckError?.message ?? null">
    <div class="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">
      <div>
        <CardFilters v-model="filters" class="mb-4" />
        <QueryState
          :loading="catalogueLoading"
          :empty="filteredCards.length === 0"
          empty-message="Aucune carte ne correspond aux filtres."
        >
          <div class="grid grid-cols-3 gap-x-3 gap-y-6 sm:grid-cols-4 md:grid-cols-5">
            <div v-for="card in filteredCards" :key="card.id">
              <DeckBuilderCardTile
                :card="card"
                :quantity="quantityInDeck(card.id)"
                :disabled="isCardDisabled(card)"
                draggable
                @click="addCard(card)"
              />
              <p class="mt-1 truncate text-center text-[10px] text-muted-foreground">{{ card.set.name }}</p>
            </div>
          </div>
        </QueryState>
      </div>

      <div class="flex h-fit flex-col gap-4 rounded-xl border bg-card p-4" @dragover.prevent @drop="onDrop">
        <Input v-model="deckName" placeholder="Nom du deck" />
        <SelectField v-model="format" :options="formatOptions" />
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
            @click="removeCard(entry.card.id)"
          />
        </div>

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
          <div class="flex h-16 items-end gap-1">
            <div v-for="[cost, count] in costCurve" :key="cost" class="flex flex-1 flex-col items-center gap-1">
              <div class="w-full rounded-t bg-primary" :style="{ height: `${(count / maxCostCount) * 100}%` }" />
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

        <p v-if="error" class="text-sm text-destructive">{{ error }}</p>
        <Button :disabled="saveMutation.isPending.value || !canSave" @click="onSave">
          {{ saveMutation.isPending.value ? 'Enregistrement...' : 'Enregistrer' }}
        </Button>
      </div>
    </div>
  </QueryState>
</template>
