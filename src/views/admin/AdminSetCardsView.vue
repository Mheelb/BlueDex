<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { CopyIcon, PencilIcon, PlusIcon, Trash2Icon, UploadIcon } from '@lucide/vue'
import { supabase } from '@/lib/supabase'
import type { Card, CardType, Faction, Rarity, Subtype } from '@/types/card'
import { CARD_TYPES, FACTIONS, RARITIES, SUBTYPES, createEmptyCardFilters } from '@/types/card'
import { filterAndSortCards } from '@/lib/filterCards'
import { useSetBySlug } from '@/composables/useSetBySlug'
import SelectField from '@/components/SelectField.vue'
import type { SelectFieldOption } from '@/components/SelectField.vue'
import BackButton from '@/components/BackButton.vue'
import CardFilters from '@/components/CardFilters.vue'
import { Card as UiCard, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import ConfirmDeleteDialog from '@/components/ConfirmDeleteDialog.vue'

const props = defineProps<{ setSlug: string }>()

const { set, error: setError, loadSet } = useSetBySlug()
const cards = ref<Card[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const saving = ref(false)
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
const filteredCards = computed(() => filterAndSortCards(cards.value, filters.value))

async function load() {
  loading.value = true
  error.value = null

  const ok = await loadSet(props.setSlug)
  if (!ok || !set.value) {
    error.value = setError.value
    loading.value = false
    return
  }

  const { data: cardsData, error: cardsError } = await supabase
    .from('cards')
    .select('*')
    .eq('set_id', set.value.id)
    .order('number', { ascending: true })

  if (cardsError) {
    error.value = cardsError.message
  } else {
    cards.value = cardsData as Card[]
  }
  loading.value = false
}

onMounted(load)

const fileInputEl = ref<HTMLInputElement | null>(null)

function onFileChange(event: Event) {
  imageFile.value = (event.target as HTMLInputElement).files?.[0] ?? null
}

function triggerFileInput() {
  fileInputEl.value?.click()
}

async function syncCardCount() {
  if (!set.value) return
  await supabase.from('sets').update({ card_count: cards.value.length }).eq('id', set.value.id)
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

async function onSubmit() {
  if (!set.value) return
  if (!validate()) return

  saving.value = true
  error.value = null

  let image_url: string | undefined

  if (imageFile.value) {
    const path = `${set.value.slug}/${form.number}-${Date.now()}-${imageFile.value.name}`
    const { error: uploadError } = await supabase.storage.from('card-images').upload(path, imageFile.value)
    if (uploadError) {
      error.value = uploadError.message
      saving.value = false
      return
    }
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

  const { error: saveError } = editingId.value
    ? await supabase.from('cards').update(payload).eq('id', editingId.value)
    : await supabase.from('cards').insert(payload)

  saving.value = false

  if (saveError) {
    error.value = saveError.message
    return
  }

  if (image_url && editingImageUrl.value) {
    await deleteCardImage(editingImageUrl.value)
  }

  sheetOpen.value = false
  resetForm()
  await load()
  await syncCardCount()
}

async function onDelete(card: Card) {
  const { error: deleteError } = await supabase.from('cards').delete().eq('id', card.id)
  if (deleteError) {
    error.value = deleteError.message
    return
  }
  await deleteCardImage(card.image_url)
  await load()
  await syncCardCount()
}
</script>

<template>
  <BackButton :to="{ name: 'admin-sets' }" label="Retour aux sets" class="mb-4" />

  <div class="mb-6 flex items-center justify-between">
    <h1 class="text-2xl font-bold">Admin · {{ set?.name ?? '...' }}</h1>
    <Button @click="openCreateSheet">
      <PlusIcon />
      Ajouter une nouvelle carte
    </Button>
  </div>

  <p v-if="loading" class="text-muted-foreground">Chargement...</p>

  <template v-else>
    <CardFilters v-model="filters" class="mb-4" />

    <p v-if="filteredCards.length === 0" class="text-muted-foreground">Aucune carte ne correspond aux filtres.</p>

    <div v-else class="flex flex-col gap-2">
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
  </template>

  <Sheet v-model:open="sheetOpen">
    <SheetContent class="flex w-full flex-col gap-0 sm:max-w-xl">
      <SheetHeader class="border-b">
        <SheetTitle>{{ editingId ? 'Modifier la carte' : 'Nouvelle carte' }}</SheetTitle>
      </SheetHeader>

      <form class="flex flex-1 flex-col overflow-y-auto" @submit.prevent="onSubmit" novalidate>
        <div class="grid grid-cols-1 gap-3 p-4 sm:grid-cols-3">
          <div class="flex flex-col gap-1.5">
            <Label for="card-number">Numéro *</Label>
            <Input id="card-number" v-model="form.number" :aria-invalid="!!fieldErrors.number" />
            <p v-if="fieldErrors.number" class="text-xs text-destructive">{{ fieldErrors.number }}</p>
          </div>
          <div class="flex flex-col gap-1.5 sm:col-span-2">
            <Label for="card-name">Nom *</Label>
            <Input id="card-name" v-model="form.name" :aria-invalid="!!fieldErrors.name" />
            <p v-if="fieldErrors.name" class="text-xs text-destructive">{{ fieldErrors.name }}</p>
          </div>

          <div class="flex flex-col gap-1.5 sm:col-span-3">
            <Label>Rareté *</Label>
            <SelectField
              v-model="form.rarity"
              :options="rarityOptions"
              placeholder="Rareté"
              :class="fieldErrors.rarity ? 'border-destructive ring-destructive/20' : ''"
            />
            <p v-if="fieldErrors.rarity" class="text-xs text-destructive">{{ fieldErrors.rarity }}</p>
          </div>
          <div class="flex flex-col gap-1.5 sm:col-span-3">
            <Label>Type</Label>
            <SelectField v-model="form.type" :options="typeOptions" placeholder="Type" />
          </div>
          <div class="flex flex-col gap-1.5 sm:col-span-3">
            <Label>Sous-type</Label>
            <SelectField v-model="form.subtype" :options="subtypeOptions" placeholder="Sous-type" />
          </div>
          <div class="flex flex-col gap-1.5 sm:col-span-3">
            <Label>Faction</Label>
            <SelectField v-model="form.faction" :options="factionOptions" placeholder="Faction" />
          </div>

          <div class="flex flex-col gap-1.5">
            <Label for="card-cost">Coût</Label>
            <Input id="card-cost" v-model="form.cost" type="number" min="0" :aria-invalid="!!fieldErrors.cost" />
            <p v-if="fieldErrors.cost" class="text-xs text-destructive">{{ fieldErrors.cost }}</p>
          </div>
          <div class="flex flex-col gap-1.5">
            <Label for="card-power">Puissance</Label>
            <Input id="card-power" v-model="form.power" type="number" min="0" :aria-invalid="!!fieldErrors.power" />
            <p v-if="fieldErrors.power" class="text-xs text-destructive">{{ fieldErrors.power }}</p>
          </div>
          <div class="flex flex-col gap-1.5">
            <Label for="card-support">Soutien</Label>
            <Input
              id="card-support"
              v-model="form.support"
              type="number"
              min="0"
              :aria-invalid="!!fieldErrors.support"
            />
            <p v-if="fieldErrors.support" class="text-xs text-destructive">{{ fieldErrors.support }}</p>
          </div>

          <div class="flex flex-col gap-1.5 sm:col-span-3">
            <Label for="card-effect">Effet de la carte</Label>
            <Textarea id="card-effect" v-model="form.effect" rows="3" />
          </div>

          <div class="flex flex-col gap-1.5 sm:col-span-3">
            <Label for="card-artist">Artiste (illustration)</Label>
            <Input id="card-artist" v-model="form.artist" placeholder="Optionnel" />
          </div>

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

          <div v-if="form.is_numbered" class="flex flex-col gap-1.5 sm:col-span-3">
            <Label for="card-numbered-total">Nombre d'exemplaires *</Label>
            <Input
              id="card-numbered-total"
              v-model="form.numbered_total"
              type="number"
              min="1"
              :aria-invalid="!!fieldErrors.numbered_total"
            />
            <p v-if="fieldErrors.numbered_total" class="text-xs text-destructive">{{ fieldErrors.numbered_total }}</p>
          </div>

          <div class="flex flex-col gap-1.5 sm:col-span-3">
            <Label>
              Image scannée{{ editingId ? ' (laisser vide pour garder l’actuelle)' : ' (optionnel)' }}
            </Label>
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
          </div>
        </div>

        <SheetFooter class="border-t">
          <p v-if="error" class="text-sm text-destructive">{{ error }}</p>
          <div class="flex gap-3">
            <Button type="submit" :disabled="saving">
              {{ saving ? 'Enregistrement...' : editingId ? 'Mettre à jour la carte' : 'Ajouter la carte' }}
            </Button>
            <Button type="button" variant="ghost" @click="sheetOpen = false">Annuler</Button>
          </div>
        </SheetFooter>
      </form>
    </SheetContent>
  </Sheet>
</template>
