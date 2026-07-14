<script setup lang="ts">
import { computed } from 'vue'
import type { Card as CardModel, CardFilters } from '@/types/card'
import { CARD_TYPES, COST_RANGE, FACTIONS, POWER_RANGE, RARITIES, SUBTYPES, SUPPORT_RANGE } from '@/types/card'
import SearchInput from '@/components/form/SearchInput.vue'
import SelectField from '@/components/form/SelectField.vue'
import type { SelectFieldOption } from '@/components/form/SelectField.vue'
import MultiSelectField from '@/components/form/MultiSelectField.vue'
import { Card, CardContent } from '@/components/ui/card'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import RangeSliderField from '@/components/form/RangeSliderField.vue'
import { FilterIcon } from '@lucide/vue'

const props = defineProps<{
  modelValue: CardFilters
  cards?: CardModel[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: CardFilters]
}>()

function update<K extends keyof CardFilters>(key: K, value: CardFilters[K]) {
  emit('update:modelValue', { ...props.modelValue, [key]: value })
}

function facetProxy<K extends 'rarity' | 'type' | 'subtype' | 'faction' | 'artist'>(key: K) {
  return computed({
    get: () => props.modelValue[key],
    set: (value: string[]) => update(key, value as CardFilters[K]),
  })
}

const search = computed({
  get: () => props.modelValue.search,
  set: (value: string) => update('search', value),
})

const rarity = facetProxy('rarity')
const type = facetProxy('type')
const subtype = facetProxy('subtype')
const faction = facetProxy('faction')
const artist = facetProxy('artist')

const sort = computed({
  get: () => props.modelValue.sort,
  set: (value: CardFilters['sort']) => update('sort', value),
})

function rangeProxy(key: 'costRange' | 'powerRange' | 'supportRange') {
  return computed({
    get: () => props.modelValue[key],
    set: (value: number[]) => update(key, [value[0], value[1]]),
  })
}

const costRange = rangeProxy('costRange')
const powerRange = rangeProxy('powerRange')
const supportRange = rangeProxy('supportRange')

function toOptions(values: readonly string[]): SelectFieldOption[] {
  return values.map((v) => ({ value: v, label: v }))
}

const rarityOptions = toOptions(RARITIES)
const typeOptions = toOptions(CARD_TYPES)
const subtypeOptions = toOptions(SUBTYPES)
const factionOptions = toOptions(FACTIONS)

const artistOptions = computed(() => {
  const artists = new Set<string>()
  for (const card of props.cards ?? []) {
    if (card.artist) artists.add(card.artist)
  }
  return toOptions([...artists].sort((a, b) => a.localeCompare(b)))
})

const sortOptions: SelectFieldOption[] = [
  { value: 'number-asc', label: 'Numéro croissant' },
  { value: 'number-desc', label: 'Numéro décroissant' },
  { value: 'name-asc', label: 'Nom (A → Z)' },
  { value: 'name-desc', label: 'Nom (Z → A)' },
]
</script>

<template>
  <Card class="shadow-sm">
    <CardContent class="flex flex-wrap items-center gap-3">
      <SearchInput v-model="search" placeholder="Rechercher une carte..." class="min-w-[180px] flex-1" />

      <MultiSelectField v-model="rarity" :options="rarityOptions" placeholder="Rareté" class="hidden md:flex" />
      <MultiSelectField v-model="type" :options="typeOptions" placeholder="Type" class="hidden md:flex" />
      <MultiSelectField v-model="subtype" :options="subtypeOptions" placeholder="Sous-type" class="hidden md:flex" />
      <MultiSelectField v-model="faction" :options="factionOptions" placeholder="Faction" class="hidden md:flex" />
      <MultiSelectField v-model="artist" :options="artistOptions" placeholder="Illustrateur" class="hidden md:flex" />
      <SelectField v-model="sort" :options="sortOptions" class="hidden md:flex" />

      <Popover>
        <PopoverTrigger as-child>
          <Button variant="outline" size="sm">
            <FilterIcon />
            Filtres
          </Button>
        </PopoverTrigger>
        <PopoverContent class="flex w-72 flex-col gap-3" align="end">
          <div class="flex flex-col gap-2 md:hidden">
            <MultiSelectField v-model="rarity" :options="rarityOptions" placeholder="Rareté" />
            <MultiSelectField v-model="type" :options="typeOptions" placeholder="Type" />
            <MultiSelectField v-model="subtype" :options="subtypeOptions" placeholder="Sous-type" />
            <MultiSelectField v-model="faction" :options="factionOptions" placeholder="Faction" />
            <MultiSelectField v-model="artist" :options="artistOptions" placeholder="Illustrateur" />
            <SelectField v-model="sort" :options="sortOptions" />
          </div>

          <RangeSliderField v-model="costRange" label="Coût" :min="COST_RANGE[0]" :max="COST_RANGE[1]" />
          <RangeSliderField v-model="powerRange" label="Puissance" :min="POWER_RANGE[0]" :max="POWER_RANGE[1]" />
          <RangeSliderField v-model="supportRange" label="Soutien" :min="SUPPORT_RANGE[0]" :max="SUPPORT_RANGE[1]" />
        </PopoverContent>
      </Popover>
    </CardContent>
  </Card>
</template>
