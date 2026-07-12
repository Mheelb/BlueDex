<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { useForm } from '@tanstack/vue-form'
import { ImageDownIcon, ListIcon, PencilIcon, PlusIcon, Trash2Icon } from '@lucide/vue'
import { supabase } from '@/lib/supabase'
import type { CardSet } from '@/types/card'
import { fetchSets, setKeys } from '@/queries/sets'
import { cardKeys } from '@/queries/cards'
import { migrateAllCardImages, type MigrationSummary } from '@/lib/imageMigration'
import { required, slugPattern } from '@/lib/formValidators'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import ConfirmDeleteDialog from '@/components/common/ConfirmDeleteDialog.vue'
import FormField from '@/components/form/FormField.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import QueryState from '@/components/common/QueryState.vue'

const queryClient = useQueryClient()

const { data: sets, isPending: loading } = useQuery({
  queryKey: setKeys.list('created_at'),
  queryFn: () => fetchSets('created_at'),
})

const error = ref<string | null>(null)
const sheetOpen = ref(false)
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

const validateSlug = ({ value }: { value: string }) =>
  required('Le slug est requis.')({ value }) ??
  slugPattern('Uniquement des minuscules, chiffres et tirets (ex: base-set).')({ value })

const saveMutation = useMutation({
  mutationFn: async (value: ReturnType<typeof emptyForm>) => {
    const payload = {
      name: value.name,
      slug: value.slug,
      release_date: value.release_date || null,
      logo_url: value.logo_url || null,
      symbol_url: value.symbol_url || null,
    }

    const { error: saveError } = editingId.value
      ? await supabase.from('sets').update(payload).eq('id', editingId.value)
      : await supabase.from('sets').insert({ ...payload, card_count: 0 })

    if (saveError) throw new Error(saveError.message)
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: setKeys.all })
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

function resetForm() {
  editingId.value = null
  form.reset(emptyForm())
  error.value = null
}

function openCreateSheet() {
  resetForm()
  sheetOpen.value = true
}

function openEditSheet(set: CardSet) {
  resetForm()
  editingId.value = set.id
  form.reset({
    name: set.name,
    slug: set.slug,
    release_date: set.release_date ?? '',
    logo_url: set.logo_url ?? '',
    symbol_url: set.symbol_url ?? '',
  })
  sheetOpen.value = true
}

const deleteMutation = useMutation({
  mutationFn: async (set: CardSet) => {
    const { error: deleteError } = await supabase.from('sets').delete().eq('id', set.id)
    if (deleteError) throw new Error(deleteError.message)
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: setKeys.all })
  },
  onError: (err) => {
    error.value = err.message
  },
})

function onDelete(set: CardSet) {
  deleteMutation.mutate(set)
}

const migrating = ref(false)
const migrationProgress = reactive({ done: 0, total: 0 })
const migrationSummary = ref<MigrationSummary | null>(null)
const migrationError = ref<string | null>(null)

function formatKb(bytes: number) {
  return `${(bytes / 1024).toFixed(0)} Ko`
}

async function onMigrateImages() {
  if (migrating.value) return

  migrating.value = true
  migrationError.value = null
  migrationSummary.value = null
  migrationProgress.done = 0
  migrationProgress.total = 0

  try {
    const summary = await migrateAllCardImages((progress) => {
      migrationProgress.done = progress.done
      migrationProgress.total = progress.total
    })
    migrationSummary.value = summary
    queryClient.invalidateQueries({ queryKey: cardKeys.all })
  } catch (err) {
    migrationError.value = (err as Error).message
  } finally {
    migrating.value = false
  }
}
</script>

<template>
  <PageHeader title="Admin · Sets">
    <div class="flex gap-2">
      <ConfirmDeleteDialog
        title="Optimiser toutes les images ?"
        description="Recompresse les images de cartes en WebP directement dans Supabase. Les fichiers d'origine seront supprimés du bucket une fois remplacés. Ça peut prendre plusieurs minutes selon le nombre de cartes."
        confirm-label="Optimiser"
        variant="default"
        @confirm="onMigrateImages"
      >
        <Button variant="outline" :disabled="migrating">
          <ImageDownIcon />
          {{ migrating ? 'Optimisation en cours...' : 'Optimiser les images' }}
        </Button>
      </ConfirmDeleteDialog>
      <Button @click="openCreateSheet">
        <PlusIcon />
        Ajouter un set
      </Button>
    </div>
  </PageHeader>

  <div v-if="migrating" class="mb-4 text-sm text-muted-foreground">
    {{ migrationProgress.done }} / {{ migrationProgress.total }} images traitées...
  </div>
  <p v-else-if="migrationError" class="mb-4 text-sm text-destructive">{{ migrationError }}</p>
  <div v-else-if="migrationSummary" class="mb-4 text-sm text-muted-foreground">
    {{ migrationSummary.optimizedCount }} image(s) optimisée(s), {{ formatKb(migrationSummary.bytesSaved) }} économisés
    · {{ migrationSummary.skippedCount }} déjà optimales
    <span v-if="migrationSummary.errorCount"> · {{ migrationSummary.errorCount }} erreur(s)</span>
  </div>

  <QueryState :loading="loading" :empty="sets?.length === 0" empty-message="Aucun set pour le moment.">
    <div class="flex flex-col gap-3">
      <Card v-for="set in sets ?? []" :key="set.id">
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
  </QueryState>

  <Sheet v-model:open="sheetOpen">
    <SheetContent class="flex w-full flex-col gap-0 sm:max-w-xl">
      <SheetHeader>
        <SheetTitle>{{ editingId ? 'Modifier le set' : 'Nouveau set' }}</SheetTitle>
      </SheetHeader>
      <Separator />

      <form class="flex flex-1 flex-col overflow-y-auto" novalidate @submit.prevent="() => form.handleSubmit()">
        <div class="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
          <form.Field v-slot="{ field }" name="name" :validators="{ onChange: required('Le nom est requis.') }">
            <FormField label="Nom" for="set-name" required :error="field.state.meta.errors[0]">
              <Input
                id="set-name"
                :model-value="field.state.value"
                :aria-invalid="field.state.meta.errors.length > 0"
                @update:model-value="(v) => field.handleChange(String(v))"
                @blur="field.handleBlur"
              />
            </FormField>
          </form.Field>
          <form.Field v-slot="{ field }" name="slug" :validators="{ onChange: validateSlug }">
            <FormField label="Slug" for="set-slug" required :error="field.state.meta.errors[0]">
              <Input
                id="set-slug"
                :model-value="field.state.value"
                placeholder="ex: base-set"
                :aria-invalid="field.state.meta.errors.length > 0"
                @update:model-value="(v) => field.handleChange(String(v))"
                @blur="field.handleBlur"
              />
            </FormField>
          </form.Field>
          <form.Field v-slot="{ field }" name="release_date">
            <FormField label="Date de sortie" for="set-release">
              <Input
                id="set-release"
                :model-value="field.state.value"
                type="date"
                @update:model-value="(v) => field.handleChange(String(v))"
              />
            </FormField>
          </form.Field>
          <form.Field v-slot="{ field }" name="logo_url">
            <FormField label="URL du logo" for="set-logo">
              <Input
                id="set-logo"
                :model-value="field.state.value"
                placeholder="Optionnel"
                @update:model-value="(v) => field.handleChange(String(v))"
              />
            </FormField>
          </form.Field>
          <form.Field v-slot="{ field }" name="symbol_url">
            <FormField label="URL du symbole" for="set-symbol" class="sm:col-span-2">
              <Input
                id="set-symbol"
                :model-value="field.state.value"
                placeholder="Optionnel"
                @update:model-value="(v) => field.handleChange(String(v))"
              />
            </FormField>
          </form.Field>
        </div>

        <Separator />
        <SheetFooter>
          <p v-if="error" class="text-sm text-destructive">{{ error }}</p>
          <div class="flex gap-3">
            <Button type="submit" :disabled="saveMutation.isPending.value">
              {{
                saveMutation.isPending.value ? 'Enregistrement...' : editingId ? 'Mettre à jour le set' : 'Créer le set'
              }}
            </Button>
            <Button type="button" variant="ghost" @click="sheetOpen = false">Annuler</Button>
          </div>
        </SheetFooter>
      </form>
    </SheetContent>
  </Sheet>
</template>
