<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ListIcon, PencilIcon, PlusIcon, Trash2Icon } from '@lucide/vue'
import { supabase } from '@/lib/supabase'
import type { CardSet } from '@/types/card'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import ConfirmDeleteDialog from '@/components/ConfirmDeleteDialog.vue'

const router = useRouter()

const sets = ref<CardSet[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const saving = ref(false)
const sheetOpen = ref(false)
const fieldErrors = ref<Record<string, string>>({})
const editingId = ref<string | null>(null)

function emptyForm() {
  return {
    name: '',
    slug: '',
    release_date: '',
    logo_url: '',
    symbol_url: '',
  }
}

const form = reactive(emptyForm())

async function load() {
  loading.value = true
  const { data, error: fetchError } = await supabase.from('sets').select('*').order('created_at', { ascending: false })
  if (fetchError) {
    error.value = fetchError.message
  } else {
    sets.value = data as CardSet[]
  }
  loading.value = false
}

onMounted(load)

function resetForm() {
  editingId.value = null
  Object.assign(form, emptyForm())
  fieldErrors.value = {}
  error.value = null
}

function openCreateSheet() {
  resetForm()
  sheetOpen.value = true
}

function openEditSheet(set: CardSet) {
  resetForm()
  editingId.value = set.id
  form.name = set.name
  form.slug = set.slug
  form.release_date = set.release_date ?? ''
  form.logo_url = set.logo_url ?? ''
  form.symbol_url = set.symbol_url ?? ''
  sheetOpen.value = true
}

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/

function validate(): boolean {
  const errors: Record<string, string> = {}

  if (!form.name.trim()) errors.name = 'Le nom est requis.'
  if (!form.slug.trim()) {
    errors.slug = 'Le slug est requis.'
  } else if (!SLUG_PATTERN.test(form.slug)) {
    errors.slug = 'Uniquement des minuscules, chiffres et tirets (ex: base-set).'
  }

  fieldErrors.value = errors
  return Object.keys(errors).length === 0
}

async function onSubmit() {
  if (!validate()) return

  saving.value = true
  error.value = null

  const payload = {
    name: form.name,
    slug: form.slug,
    release_date: form.release_date || null,
    logo_url: form.logo_url || null,
    symbol_url: form.symbol_url || null,
  }

  const { error: saveError } = editingId.value
    ? await supabase.from('sets').update(payload).eq('id', editingId.value)
    : await supabase.from('sets').insert({ ...payload, card_count: 0 })

  saving.value = false

  if (saveError) {
    error.value = saveError.message
    return
  }

  sheetOpen.value = false
  resetForm()
  await load()
}

async function onDelete(set: CardSet) {
  const { error: deleteError } = await supabase.from('sets').delete().eq('id', set.id)
  if (deleteError) {
    error.value = deleteError.message
    return
  }
  await load()
}

</script>

<template>
  <div class="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
    <div class="mb-6 flex items-center justify-between">
      <h1 class="text-2xl font-bold">Admin · Sets</h1>
      <div class="flex items-center gap-2">
        <Button @click="openCreateSheet">
          <PlusIcon />
          Ajouter un set
        </Button>
      </div>
    </div>

    <p v-if="loading" class="text-muted-foreground">Chargement...</p>
    <p v-else-if="sets.length === 0" class="text-muted-foreground">Aucun set pour le moment.</p>

    <div v-else class="flex flex-col gap-3">
      <Card v-for="set in sets" :key="set.id">
        <CardContent class="flex items-center justify-between">
          <div>
            <p class="font-medium">{{ set.name }}</p>
            <p class="mt-0.5 text-xs text-muted-foreground">
              {{ set.slug }} · <Badge variant="secondary">{{ set.card_count }} cartes</Badge>
            </p>
          </div>
          <div class="flex items-center gap-1">
            <Button as-child variant="ghost" size="icon">
              <RouterLink :to="{ name: 'admin-set-cards', params: { setSlug: set.slug } }" title="Gérer les cartes">
                <ListIcon />
              </RouterLink>
            </Button>
            <Button variant="ghost" size="icon" title="Modifier le set" @click="openEditSheet(set)">
              <PencilIcon />
            </Button>
            <ConfirmDeleteDialog
              :title="`Supprimer le set « ${set.name} » ?`"
              description="Toutes ses cartes seront définitivement supprimées."
              @confirm="onDelete(set)"
            >
              <Button variant="ghost" size="icon" class="text-destructive">
                <Trash2Icon />
              </Button>
            </ConfirmDeleteDialog>
          </div>
        </CardContent>
      </Card>
    </div>

    <Sheet v-model:open="sheetOpen">
      <SheetContent class="flex w-full flex-col gap-0 sm:max-w-xl">
        <SheetHeader class="border-b">
          <SheetTitle>{{ editingId ? 'Modifier le set' : 'Nouveau set' }}</SheetTitle>
        </SheetHeader>

        <form class="flex flex-1 flex-col overflow-y-auto" @submit.prevent="onSubmit" novalidate>
          <div class="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
            <div class="flex flex-col gap-1.5">
              <Label for="set-name">Nom *</Label>
              <Input id="set-name" v-model="form.name" :aria-invalid="!!fieldErrors.name" />
              <p v-if="fieldErrors.name" class="text-xs text-destructive">{{ fieldErrors.name }}</p>
            </div>
            <div class="flex flex-col gap-1.5">
              <Label for="set-slug">Slug *</Label>
              <Input id="set-slug" v-model="form.slug" placeholder="ex: base-set" :aria-invalid="!!fieldErrors.slug" />
              <p v-if="fieldErrors.slug" class="text-xs text-destructive">{{ fieldErrors.slug }}</p>
            </div>
            <div class="flex flex-col gap-1.5">
              <Label for="set-release">Date de sortie</Label>
              <Input id="set-release" v-model="form.release_date" type="date" />
            </div>
            <div class="flex flex-col gap-1.5">
              <Label for="set-logo">URL du logo</Label>
              <Input id="set-logo" v-model="form.logo_url" placeholder="Optionnel" />
            </div>
            <div class="flex flex-col gap-1.5 sm:col-span-2">
              <Label for="set-symbol">URL du symbole</Label>
              <Input id="set-symbol" v-model="form.symbol_url" placeholder="Optionnel" />
            </div>
          </div>

          <SheetFooter class="border-t">
            <p v-if="error" class="text-sm text-destructive">{{ error }}</p>
            <div class="flex gap-3">
              <Button type="submit" :disabled="saving">
                {{ saving ? 'Enregistrement...' : editingId ? 'Mettre à jour le set' : 'Créer le set' }}
              </Button>
              <Button type="button" variant="ghost" @click="sheetOpen = false">Annuler</Button>
            </div>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  </div>
</template>
