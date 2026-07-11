<script setup lang="ts">
import { computed } from 'vue'
import type { DeckListQuery } from '@/types/deck'
import { DECK_FORMATS, DECK_FORMAT_LABELS, DECK_SORTS, DECK_SORT_LABELS } from '@/types/deck'
import SearchInput from '@/components/form/SearchInput.vue'
import SelectField from '@/components/form/SelectField.vue'
import type { SelectFieldOption } from '@/components/form/SelectField.vue'
import { Card, CardContent } from '@/components/ui/card'

const props = defineProps<{
  modelValue: DeckListQuery
}>()

const emit = defineEmits<{
  'update:modelValue': [value: DeckListQuery]
}>()

function update<K extends keyof DeckListQuery>(key: K, value: DeckListQuery[K]) {
  emit('update:modelValue', { ...props.modelValue, [key]: value })
}

const search = computed({
  get: () => props.modelValue.search,
  set: (value: string) => update('search', value),
})

const format = computed({
  get: () => props.modelValue.format,
  set: (value: string) => update('format', value as DeckListQuery['format']),
})

const sort = computed({
  get: () => props.modelValue.sort,
  set: (value: string) => update('sort', value as DeckListQuery['sort']),
})

// Filtre format uniquement pour l'instant. D'autres facettes (niveau,
// sous-type...) viendront plus tard avec un système de tags sur les decks.
const formatOptions: SelectFieldOption[] = [
  { value: 'all', label: 'Tous les formats' },
  ...DECK_FORMATS.map((f) => ({ value: f, label: DECK_FORMAT_LABELS[f] })),
]

const sortOptions: SelectFieldOption[] = DECK_SORTS.map((s) => ({ value: s, label: DECK_SORT_LABELS[s] }))
</script>

<template>
  <Card class="mb-4 shadow-sm">
    <CardContent class="flex flex-wrap items-center gap-3">
      <SearchInput v-model="search" placeholder="Rechercher un deck..." class="min-w-[180px] flex-1" />
      <SelectField v-model="format" :options="formatOptions" placeholder="Format" />
      <SelectField v-model="sort" :options="sortOptions" placeholder="Trier par" />
    </CardContent>
  </Card>
</template>
