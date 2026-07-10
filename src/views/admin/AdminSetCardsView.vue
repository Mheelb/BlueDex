<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { CopyIcon, PencilIcon, PlusIcon, Trash2Icon, UploadIcon } from '@lucide/vue'
import { supabase } from '@/lib/supabase'
import type { Card, CardType, Faction, Rarity, Subtype } from '@/types/card'
import { CARD_TYPES, FACTIONS, RARITIES, SUBTYPES, createEmptyCardFilters } from '@/types/card'
import { filterAndSortCards } from '@/lib/filterCards'
import { useSetBySlug } from '@/composables/useSetBySlug'
import { cardKeys, fetchCardsBySet } from '@/queries/cards'
import { setKeys } from '@/queries/sets'
import SelectField from '@/components/SelectField.vue'
import type { SelectFieldOption } from '@/components/SelectField.vue'
import BackButton from '@/components/BackButton.vue'
import CardFilters from '@/components/CardFilters.vue'
import { Card as UiCard, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import ConfirmDeleteDialog from '@/components/ConfirmDeleteDialog.vue'
import FormField from '@/components/FormField.vue'
import PageHeader from '@/components/PageHeader.vue'
import QueryState from '@/components/QueryState.vue'

const props = defineProps<{ setSlug: string }>()

const queryClient = useQueryClient()

const { data: set, isPending: setLoading, error: setError } = useSetBySlug(() => props.setSlug)

const setId = computed(() => set.value?.id)
const { data: cards, isPending: cardsLoading, error: cardsError } = useQuery({
  queryKey: computed(() => cardKeys.bySet(setId.value ?? '')),
  queryFn: () => fetchCardsBySet(setId.value!, true),
  enabled: computed(() => !!setId.value),
})

const loading = computed(() => setLoading.value || (!!setId.value && cardsLoading.value))
const loadError = computed(() => setError.value?.message ?? cardsError.value?.message ?? null)

const error = ref<string | null>(null)
const imageFile = ref<File | null>(null)
const editingId = ref<string | null>(null)
const editingImageUrl = ref<string | null>(null)
const sheetOpen = ref(false)
const fieldErrors = ref<Record<string, string>>({})

const CARD_IMAGES_MARKER = '/card-images/'

function storagePathFromUrl(url: string): string | null {
  const idx = url.indexOf(CARD_IMAGES_MARKER)
  if (idx === -1) return null
  return url.slice(idx + CARD_IMAGES_MARKER.length)
}

async function deleteCardImage(imageUrl: string | null) {
  if (!imageUrl) return
  const path = storagePathFromUrl(imageUrl)
  if (!path) return
  await supabase.storage.from('card-images').remove([path])
}

async function syncCardCount(count: number) {
  if (!setId.value) return
  await supabase.from('sets').update({ card_count: count }).eq('id', setId.value)
  queryClient.invalidateQueries({ queryKey: setKeys.all })
}

const rarityOptions: SelectFieldOption[] = RARITIES.map((r) => ({ value: r, label: r }))
const typeOptions: SelectFieldOption[] = CARD_TYPES.map((t) => ({ value: t, label: t }))
const subtypeOptions: SelectFieldOption[] = SUBTYPES.map((s) => ({ value: s, label: s }))
const factionOptions: SelectFieldOption[] = FACTIONS.map((f) => ({ value: f, label: f }))

function emptyForm() {
  return {
    number: '',
    name: '',
    rarity: '' as Rarity | '',
    is_holo: false,
    is_signed: false,
    is_numbered: false,
    numbered_total: '' as string | number,
    is_full_art: false,
    is_overframe: false,
    type: '' as CardType | '',
    subtype: '' as Subtype | '',
    faction: '' as Faction | '',
    cost: '' as string | number,
    power: '' as string | number,
    support: '' as string | number,
    effect: '',
    artist: '',
  }
}

const form = reactive(emptyForm())

const filters = ref(createEmptyCardFilters())
const filteredCards = computed(() => filterAndSortCards(cards.value ?? [], filters.value))

const fileInputEl = ref<HTMLInputElement | null>(null)

function onFileChange(event: Event) {
  imageFile.value = (event.target as HTMLInputElement).files?.[0] ?? null
}

function triggerFileInput() {
  fileInputEl.value?.click()
}

function resetForm() {
  editingId.value = null
  editingImageUrl.value = null
  Object.assign(form, emptyForm())
  imageFile.value = null
  fieldErrors.value = {}
  error.value = null
  if (fileInputEl.value) fileInputEl.value.value = ''
}

function openCreateSheet() {
  resetForm()
  sheetOpen.value = true
}

function openEditSheet(card: Card) {
  resetForm()
  editingId.value = card.id
  editingImageUrl.value = card.image_url
  form.number = card.number
  form.name = card.name
  form.rarity = card.rarity
  form.is_holo = card.is_holo
  form.is_signed = card.is_signed
  form.is_numbered = card.is_numbered
  form.numbered_total = card.numbered_total ?? ''
  form.is_full_art = card.is_full_art
  form.is_overframe = card.is_overframe
  form.type = card.type ?? ''
  form.subtype = card.subtype ?? ''
  form.faction = card.faction ?? ''
  form.cost = card.cost ?? ''
  form.power = card.power ?? ''
  form.support = card.support ?? ''
  form.effect = card.effect ?? ''
  form.artist = card.artist ?? ''
  sheetOpen.value = true
}

function openDuplicateSheet(card: Card) {
  resetForm()
  form.name = card.name
  form.rarity = card.rarity
  form.is_holo = card.is_holo
  form.is_signed = card.is_signed
  form.is_numbered = card.is_numbered
  form.numbered_total = card.numbered_total ?? ''
  form.is_full_art = card.is_full_art
  form.is_overframe = card.is_overframe
  form.type = card.type ?? ''
  form.subtype = card.subtype ?? ''
  form.faction = card.faction ?? ''
  form.cost = card.cost ?? ''
  form.power = card.power ?? ''
  form.support = card.support ?? ''
  form.effect = card.effect ?? ''
  form.artist = card.artist ?? ''
  sheetOpen.value = true
}

function validate(): boolean {
  const errors: Record<string, string> = {}

  if (!form.number.trim()) errors.number = 'Le numéro est requis.'
  if (!form.name.trim()) errors.name = 'Le nom est requis.'
  if (!form.rarity) errors.rarity = 'La rareté est requise.'
  if (form.is_numbered && (form.numbered_total === '' || Number.isNaN(Number(form.numbered_total)) || Number(form.numbered_total) <= 0)) {
    errors.numbered_total = "Le nombre d'exemplaires doit être un nombre positif."
  }

  const numericFields: Array<['cost' | 'power' | 'support', string]> = [
    ['cost', 'Le coût'],
    ['power', 'La puissance'],
    ['support', 'Le soutien'],
  ]
  for (const [key, label] of numericFields) {
    const value = form[key]
    if (value !== '' && (Number.isNaN(Number(value)) || Number(value) < 0)) {
      errors[key] = `${label} doit être un nombre positif.`
    }
  }

  fieldErrors.value = errors
  return Object.keys(errors).length === 0
}

const saveMutation = useMutation({
  mutationFn: async () => {
    if (!set.value) throw new Error('Set introuvable.')

    let image_url: string | undefined

    if (imageFile.value) {
      const path = `${set.value.slug}/${form.number}-${Date.now()}-${imageFile.value.name}`
      const { error: uploadError } = await supabase.storage.from('card-images').upload(path, imageFile.value)
      if (uploadError) throw new Error(uploadError.message)
      image_url = supabase.storage.from('card-images').getPublicUrl(path).data.publicUrl
    }

    const payload = {
      set_id: set.value.id,
      number: form.number,
      name: form.name,
      rarity: form.rarity,
      is_holo: form.is_holo,
      is_signed: form.is_signed,
      is_numbered: form.is_numbered,
      numbered_total: form.is_numbered ? Number(form.numbered_total) : null,
      is_full_art: form.is_full_art,
      is_overframe: form.is_overframe,
      type: form.type || null,
      subtype: form.subtype || null,
      faction: form.faction || null,
      cost: form.cost === '' ? null : Number(form.cost),
      power: form.power === '' ? null : Number(form.power),
      support: form.support === '' ? null : Number(form.support),
      effect: form.effect || null,
      artist: form.artist || null,
      ...(image_url ? { image_url } : {}),
    }

    const isCreate = !editingId.value
    const { error: saveError } = editingId.value
      ? await supabase.from('cards').update(payload).eq('id', editingId.value)
      : await supabase.from('cards').insert(payload)

    if (saveError) throw new Error(saveError.message)

    if (image_url && editingImageUrl.value) {
      await deleteCardImage(editingImageUrl.value)
    }

    return { isCreate }
  },
  onSuccess: async ({ isCreate }) => {
    queryClient.invalidateQueries({ queryKey: cardKeys.bySet(setId.value ?? '') })
    if (isCreate) {
      await syncCardCount((cards.value?.length ?? 0) + 1)
    }
    sheetOpen.value = false
    resetForm()
  },
  onError: (err) => {
    error.value = err.message
  },
})

function onSubmit() {
  error.value = null
  if (!set.value) return
  if (!validate()) return
  saveMutation.mutate()
}

const deleteMutation = useMutation({
  mutationFn: async (card: Card) => {
    const { error: deleteError } = await supabase.from('cards').delete().eq('id', card.id)
    if (deleteError) throw new Error(deleteError.message)
    await deleteCardImage(card.image_url)
  },
  onSuccess: async () => {
    queryClient.invalidateQueries({ queryKey: cardKeys.bySet(setId.value ?? '') })
    await syncCardCount((cards.value?.length ?? 0) - 1)
  },
  onError: (err) => {
    error.value = err.message
  },
})

function onDelete(card: Card) {
  deleteMutation.mutate(card)
}
</script>

<template>
  <BackButton :to="{ name: 'admin-sets' }" label="Retour aux sets" class="mb-4" />

  <PageHeader :title="`Admin · ${set?.name ?? '...'}`">
    <Button @click="openCreateSheet">
      <PlusIcon />
      Ajouter une nouvelle carte
    </Button>
  </PageHeader>

  <QueryState :loading="loading" :error="loadError">
    <CardFilters v-model="filters" class="mb-4" />

    <QueryState :empty="filteredCards.length === 0" empty-message="Aucune carte ne correspond aux filtres.">
      <div class="flex flex-col gap-2">
        <UiCard v-for="card in filteredCards" :key="card.id">
          <CardContent class="flex items-center gap-4">
            <img
              v-if="card.image_url"
              :src="card.image_url"
              :alt="card.name"
              class="h-16 w-12 rounded object-cover"
            />
            <div v-else class="flex h-16 w-12 items-center justify-center rounded bg-muted text-[10px] text-muted-foreground">
              N/A
            </div>
            <div class="flex-1">
              <p class="font-medium">{{ card.name }} <span class="text-muted-foreground">#{{ card.number }}</span></p>
              <p class="text-xs text-muted-foreground">{{ card.rarity }}<span v-if="card.is_holo"> · Holo</span></p>
            </div>
            <div class="flex items-center gap-1">
              <Button variant="ghost" size="icon" @click="openEditSheet(card)">
                <PencilIcon />
              </Button>
              <Button variant="ghost" size="icon" title="Dupliquer" @click="openDuplicateSheet(card)">
                <CopyIcon />
              </Button>
              <ConfirmDeleteDialog
                :title="`Supprimer la carte « ${card.name} » ?`"
                description="Cette action est définitive."
                @confirm="onDelete(card)"
              >
                <Button variant="ghost" size="icon" class="text-destructive">
                  <Trash2Icon />
                </Button>
              </ConfirmDeleteDialog>
            </div>
          </CardContent>
        </UiCard>
      </div>
    </QueryState>
  </QueryState>

  <Sheet v-model:open="sheetOpen">
    <SheetContent class="flex w-full flex-col gap-0 sm:max-w-xl">
      <SheetHeader class="border-b">
        <SheetTitle>{{ editingId ? 'Modifier la carte' : 'Nouvelle carte' }}</SheetTitle>
      </SheetHeader>

      <form class="flex flex-1 flex-col overflow-y-auto" @submit.prevent="onSubmit" novalidate>
        <div class="grid grid-cols-1 gap-3 p-4 sm:grid-cols-3">
          <FormField label="Numéro" for="card-number" required :error="fieldErrors.number">
            <Input id="card-number" v-model="form.number" :aria-invalid="!!fieldErrors.number" />
          </FormField>
          <FormField label="Nom" for="card-name" required :error="fieldErrors.name" class="sm:col-span-2">
            <Input id="card-name" v-model="form.name" :aria-invalid="!!fieldErrors.name" />
          </FormField>

          <FormField label="Rareté" required :error="fieldErrors.rarity" class="sm:col-span-3">
            <SelectField
              v-model="form.rarity"
              :options="rarityOptions"
              placeholder="Rareté"
              :class="fieldErrors.rarity ? 'border-destructive ring-destructive/20' : ''"
            />
          </FormField>
          <FormField label="Type" class="sm:col-span-3">
            <SelectField v-model="form.type" :options="typeOptions" placeholder="Type" />
          </FormField>
          <FormField label="Sous-type" class="sm:col-span-3">
            <SelectField v-model="form.subtype" :options="subtypeOptions" placeholder="Sous-type" />
          </FormField>
          <FormField label="Faction" class="sm:col-span-3">
            <SelectField v-model="form.faction" :options="factionOptions" placeholder="Faction" />
          </FormField>

          <FormField label="Coût" for="card-cost" :error="fieldErrors.cost">
            <Input id="card-cost" v-model="form.cost" type="number" min="0" :aria-invalid="!!fieldErrors.cost" />
          </FormField>
          <FormField label="Puissance" for="card-power" :error="fieldErrors.power">
            <Input id="card-power" v-model="form.power" type="number" min="0" :aria-invalid="!!fieldErrors.power" />
          </FormField>
          <FormField label="Soutien" for="card-support" :error="fieldErrors.support">
            <Input
              id="card-support"
              v-model="form.support"
              type="number"
              min="0"
              :aria-invalid="!!fieldErrors.support"
            />
          </FormField>

          <FormField label="Effet de la carte" for="card-effect" class="sm:col-span-3">
            <Textarea id="card-effect" v-model="form.effect" rows="3" />
          </FormField>

          <FormField label="Artiste (illustration)" for="card-artist" class="sm:col-span-3">
            <Input id="card-artist" v-model="form.artist" placeholder="Optionnel" />
          </FormField>

          <div class="flex flex-wrap items-center gap-4 sm:col-span-3">
            <label class="flex items-center gap-2 text-sm">
              <Checkbox v-model="form.is_holo" />
              Effet holographique
            </label>
            <label class="flex items-center gap-2 text-sm">
              <Checkbox v-model="form.is_signed" />
              Signature
            </label>
            <label class="flex items-center gap-2 text-sm">
              <Checkbox v-model="form.is_numbered" />
              Numéroté
            </label>
            <label class="flex items-center gap-2 text-sm">
              <Checkbox v-model="form.is_full_art" />
              Full art
            </label>
            <label class="flex items-center gap-2 text-sm">
              <Checkbox v-model="form.is_overframe" />
              Overframe
            </label>
          </div>

          <FormField
            v-if="form.is_numbered"
            label="Nombre d'exemplaires"
            required
            for="card-numbered-total"
            :error="fieldErrors.numbered_total"
            class="sm:col-span-3"
          >
            <Input
              id="card-numbered-total"
              v-model="form.numbered_total"
              type="number"
              min="1"
              :aria-invalid="!!fieldErrors.numbered_total"
            />
          </FormField>

          <FormField
            :label="`Image scannée${editingId ? ' (laisser vide pour garder l’actuelle)' : ' (optionnel)'}`"
            class="sm:col-span-3"
          >
            <input ref="fileInputEl" type="file" accept="image/*" class="hidden" @change="onFileChange" />
            <div class="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" @click="triggerFileInput">
                <UploadIcon />
                Importer
              </Button>
              <span class="truncate text-sm text-muted-foreground">
                {{ imageFile?.name ?? 'Aucun fichier sélectionné' }}
              </span>
            </div>
          </FormField>
        </div>

        <SheetFooter class="border-t">
          <p v-if="error" class="text-sm text-destructive">{{ error }}</p>
          <div class="flex gap-3">
            <Button type="submit" :disabled="saveMutation.isPending.value">
              {{ saveMutation.isPending.value ? 'Enregistrement...' : editingId ? 'Mettre à jour la carte' : 'Ajouter la carte' }}
            </Button>
            <Button type="button" variant="ghost" @click="sheetOpen = false">Annuler</Button>
          </div>
        </SheetFooter>
      </form>
    </SheetContent>
  </Sheet>
</template>
