<script setup lang="ts">
import { computed, ref } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { useForm } from '@tanstack/vue-form'
import { CopyIcon, PencilIcon, PlusIcon, Trash2Icon, UploadIcon } from '@lucide/vue'
import { supabase } from '@/lib/supabase'
import { convertImageToWebP } from '@/lib/imageCompression'
import { deleteCardImage, uploadCardImage } from '@/lib/cardImageStorage'
import type { Card, CardType, Faction, Rarity, Subtype } from '@/types/card'
import { CARD_TYPES, FACTIONS, RARITIES, SUBTYPES, createEmptyCardFilters } from '@/types/card'
import { required, optionalNonNegativeNumber } from '@/lib/formValidators'
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
import { Separator } from '@/components/ui/separator'
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
const converting = ref(false)
const editingId = ref<string | null>(null)
const editingImageUrl = ref<string | null>(null)
const sheetOpen = ref(false)

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

const filters = ref(createEmptyCardFilters())
const filteredCards = computed(() => filterAndSortCards(cards.value ?? [], filters.value))

const fileInputEl = ref<HTMLInputElement | null>(null)

async function onFileChange(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0] ?? null
  if (!file) {
    imageFile.value = null
    return
  }

  converting.value = true
  try {
    imageFile.value = await convertImageToWebP(file)
  } finally {
    converting.value = false
  }
}

function triggerFileInput() {
  fileInputEl.value?.click()
}

function resetForm() {
  editingId.value = null
  editingImageUrl.value = null
  form.reset(emptyForm())
  imageFile.value = null
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
  form.reset({
    number: card.number,
    name: card.name,
    rarity: card.rarity,
    is_holo: card.is_holo,
    is_signed: card.is_signed,
    is_numbered: card.is_numbered,
    numbered_total: card.numbered_total ?? '',
    is_full_art: card.is_full_art,
    is_overframe: card.is_overframe,
    type: card.type ?? '',
    subtype: card.subtype ?? '',
    faction: card.faction ?? '',
    cost: card.cost ?? '',
    power: card.power ?? '',
    support: card.support ?? '',
    effect: card.effect ?? '',
    artist: card.artist ?? '',
  })
  sheetOpen.value = true
}

function openDuplicateSheet(card: Card) {
  resetForm()
  form.reset({
    ...emptyForm(),
    name: card.name,
    rarity: card.rarity,
    is_holo: card.is_holo,
    is_signed: card.is_signed,
    is_numbered: card.is_numbered,
    numbered_total: card.numbered_total ?? '',
    is_full_art: card.is_full_art,
    is_overframe: card.is_overframe,
    type: card.type ?? '',
    subtype: card.subtype ?? '',
    faction: card.faction ?? '',
    cost: card.cost ?? '',
    power: card.power ?? '',
    support: card.support ?? '',
    effect: card.effect ?? '',
    artist: card.artist ?? '',
  })
  sheetOpen.value = true
}

const validateRarity = ({ value }: { value: string }) => (value ? undefined : 'La rareté est requise.')

function validateNumberedTotal({ value, fieldApi }: { value: string | number; fieldApi: { form: { getFieldValue: (name: string) => unknown } } }) {
  if (!fieldApi.form.getFieldValue('is_numbered')) return undefined
  if (value === '' || Number.isNaN(Number(value)) || Number(value) <= 0) {
    return "Le nombre d'exemplaires doit être un nombre positif."
  }
  return undefined
}

const saveMutation = useMutation({
  mutationFn: async (value: ReturnType<typeof emptyForm>) => {
    if (!set.value) throw new Error('Set introuvable.')

    let image_url: string | undefined

    if (imageFile.value) {
      const path = `${set.value.slug}/${value.number}-${Date.now()}-${imageFile.value.name}`
      image_url = await uploadCardImage(path, imageFile.value)
    }

    const payload = {
      set_id: set.value.id,
      number: value.number,
      name: value.name,
      rarity: value.rarity,
      is_holo: value.is_holo,
      is_signed: value.is_signed,
      is_numbered: value.is_numbered,
      numbered_total: value.is_numbered ? Number(value.numbered_total) : null,
      is_full_art: value.is_full_art,
      is_overframe: value.is_overframe,
      type: value.type || null,
      subtype: value.subtype || null,
      faction: value.faction || null,
      cost: value.cost === '' ? null : Number(value.cost),
      power: value.power === '' ? null : Number(value.power),
      support: value.support === '' ? null : Number(value.support),
      effect: value.effect || null,
      artist: value.artist || null,
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

const form = useForm({
  defaultValues: emptyForm(),
  onSubmit: async ({ value }) => {
    await saveMutation.mutateAsync(value)
  },
})

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
      <SheetHeader>
        <SheetTitle>{{ editingId ? 'Modifier la carte' : 'Nouvelle carte' }}</SheetTitle>
      </SheetHeader>
      <Separator />

      <form class="flex flex-1 flex-col overflow-y-auto" @submit.prevent="() => form.handleSubmit()" novalidate>
        <div class="grid grid-cols-1 gap-3 p-4 sm:grid-cols-3">
          <form.Field name="number" :validators="{ onChange: required('Le numéro est requis.') }" v-slot="{ field }">
            <FormField label="Numéro" for="card-number" required :error="field.state.meta.errors[0]">
              <Input
                id="card-number"
                :model-value="field.state.value"
                :aria-invalid="field.state.meta.errors.length > 0"
                @update:model-value="(v) => field.handleChange(String(v))"
                @blur="field.handleBlur"
              />
            </FormField>
          </form.Field>
          <form.Field name="name" :validators="{ onChange: required('Le nom est requis.') }" v-slot="{ field }">
            <FormField label="Nom" for="card-name" required :error="field.state.meta.errors[0]" class="sm:col-span-2">
              <Input
                id="card-name"
                :model-value="field.state.value"
                :aria-invalid="field.state.meta.errors.length > 0"
                @update:model-value="(v) => field.handleChange(String(v))"
                @blur="field.handleBlur"
              />
            </FormField>
          </form.Field>

          <form.Field name="rarity" :validators="{ onChange: validateRarity }" v-slot="{ field }">
            <FormField label="Rareté" required :error="field.state.meta.errors[0]" class="sm:col-span-3">
              <SelectField
                :model-value="field.state.value"
                :options="rarityOptions"
                placeholder="Rareté"
                :class="field.state.meta.errors.length > 0 ? 'border-destructive ring-destructive/20' : ''"
                @update:model-value="(v) => field.handleChange(v as typeof field.state.value)"
              />
            </FormField>
          </form.Field>
          <form.Field name="type" v-slot="{ field }">
            <FormField label="Type" class="sm:col-span-3">
              <SelectField
                :model-value="field.state.value"
                :options="typeOptions"
                placeholder="Type"
                @update:model-value="(v) => field.handleChange(v as typeof field.state.value)"
              />
            </FormField>
          </form.Field>
          <form.Field name="subtype" v-slot="{ field }">
            <FormField label="Sous-type" class="sm:col-span-3">
              <SelectField
                :model-value="field.state.value"
                :options="subtypeOptions"
                placeholder="Sous-type"
                @update:model-value="(v) => field.handleChange(v as typeof field.state.value)"
              />
            </FormField>
          </form.Field>
          <form.Field name="faction" v-slot="{ field }">
            <FormField label="Faction" class="sm:col-span-3">
              <SelectField
                :model-value="field.state.value"
                :options="factionOptions"
                placeholder="Faction"
                @update:model-value="(v) => field.handleChange(v as typeof field.state.value)"
              />
            </FormField>
          </form.Field>

          <form.Field name="cost" :validators="{ onChange: optionalNonNegativeNumber('Le coût doit être un nombre positif.') }" v-slot="{ field }">
            <FormField label="Coût" for="card-cost" :error="field.state.meta.errors[0]">
              <Input
                id="card-cost"
                :model-value="field.state.value"
                type="number"
                min="0"
                :aria-invalid="field.state.meta.errors.length > 0"
                @update:model-value="(v) => field.handleChange(v)"
                @blur="field.handleBlur"
              />
            </FormField>
          </form.Field>
          <form.Field name="power" :validators="{ onChange: optionalNonNegativeNumber('La puissance doit être un nombre positif.') }" v-slot="{ field }">
            <FormField label="Puissance" for="card-power" :error="field.state.meta.errors[0]">
              <Input
                id="card-power"
                :model-value="field.state.value"
                type="number"
                min="0"
                :aria-invalid="field.state.meta.errors.length > 0"
                @update:model-value="(v) => field.handleChange(v)"
                @blur="field.handleBlur"
              />
            </FormField>
          </form.Field>
          <form.Field name="support" :validators="{ onChange: optionalNonNegativeNumber('Le soutien doit être un nombre positif.') }" v-slot="{ field }">
            <FormField label="Soutien" for="card-support" :error="field.state.meta.errors[0]">
              <Input
                id="card-support"
                :model-value="field.state.value"
                type="number"
                min="0"
                :aria-invalid="field.state.meta.errors.length > 0"
                @update:model-value="(v) => field.handleChange(v)"
                @blur="field.handleBlur"
              />
            </FormField>
          </form.Field>

          <form.Field name="effect" v-slot="{ field }">
            <FormField label="Effet de la carte" for="card-effect" class="sm:col-span-3">
              <Textarea
                id="card-effect"
                :model-value="field.state.value"
                rows="3"
                @update:model-value="(v) => field.handleChange(String(v))"
              />
            </FormField>
          </form.Field>

          <form.Field name="artist" v-slot="{ field }">
            <FormField label="Artiste (illustration)" for="card-artist" class="sm:col-span-3">
              <Input
                id="card-artist"
                :model-value="field.state.value"
                placeholder="Optionnel"
                @update:model-value="(v) => field.handleChange(String(v))"
              />
            </FormField>
          </form.Field>

          <form.Field name="is_numbered" v-slot="{ field: isNumberedField }">
            <div class="flex flex-wrap items-center gap-4 sm:col-span-3">
              <form.Field name="is_holo" v-slot="{ field }">
                <label class="flex items-center gap-2 text-sm">
                  <Checkbox :model-value="field.state.value" @update:model-value="(v) => field.handleChange(!!v)" />
                  Effet holographique
                </label>
              </form.Field>
              <form.Field name="is_signed" v-slot="{ field }">
                <label class="flex items-center gap-2 text-sm">
                  <Checkbox :model-value="field.state.value" @update:model-value="(v) => field.handleChange(!!v)" />
                  Signature
                </label>
              </form.Field>
              <label class="flex items-center gap-2 text-sm">
                <Checkbox
                  :model-value="isNumberedField.state.value"
                  @update:model-value="(v) => isNumberedField.handleChange(!!v)"
                />
                Numéroté
              </label>
              <form.Field name="is_full_art" v-slot="{ field }">
                <label class="flex items-center gap-2 text-sm">
                  <Checkbox :model-value="field.state.value" @update:model-value="(v) => field.handleChange(!!v)" />
                  Full art
                </label>
              </form.Field>
              <form.Field name="is_overframe" v-slot="{ field }">
                <label class="flex items-center gap-2 text-sm">
                  <Checkbox :model-value="field.state.value" @update:model-value="(v) => field.handleChange(!!v)" />
                  Overframe
                </label>
              </form.Field>
            </div>

            <form.Field
              v-if="isNumberedField.state.value"
              name="numbered_total"
              :validators="{ onChange: validateNumberedTotal, onChangeListenTo: ['is_numbered'] }"
              v-slot="{ field }"
            >
              <FormField
                label="Nombre d'exemplaires"
                required
                for="card-numbered-total"
                :error="field.state.meta.errors[0]"
                class="sm:col-span-3"
              >
                <Input
                  id="card-numbered-total"
                  :model-value="field.state.value"
                  type="number"
                  min="1"
                  :aria-invalid="field.state.meta.errors.length > 0"
                  @update:model-value="(v) => field.handleChange(v)"
                  @blur="field.handleBlur"
                />
              </FormField>
            </form.Field>
          </form.Field>

          <FormField
            :label="`Image scannée${editingId ? ' (laisser vide pour garder l’actuelle)' : ' (optionnel)'}`"
            class="sm:col-span-3"
          >
            <input ref="fileInputEl" type="file" accept="image/*" class="hidden" @change="onFileChange" />
            <div class="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" :disabled="converting" @click="triggerFileInput">
                <UploadIcon />
                Importer
              </Button>
              <span class="truncate text-sm text-muted-foreground">
                {{ converting ? 'Compression...' : imageFile?.name ?? 'Aucun fichier sélectionné' }}
              </span>
            </div>
          </FormField>
        </div>

        <Separator />
        <SheetFooter>
          <p v-if="error" class="text-sm text-destructive">{{ error }}</p>
          <div class="flex gap-3">
            <Button type="submit" :disabled="saveMutation.isPending.value || converting">
              {{ saveMutation.isPending.value ? 'Enregistrement...' : editingId ? 'Mettre à jour la carte' : 'Ajouter la carte' }}
            </Button>
            <Button type="button" variant="ghost" @click="sheetOpen = false">Annuler</Button>
          </div>
        </SheetFooter>
      </form>
    </SheetContent>
  </Sheet>
</template>
