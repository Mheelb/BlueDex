<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { PencilIcon, SparklesIcon, Trash2Icon } from '@lucide/vue'
import { supabase } from '@/lib/supabase'
import type { Article } from '@/types/article'
import BackButton from '@/components/BackButton.vue'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import ConfirmDeleteDialog from '@/components/ConfirmDeleteDialog.vue'
import FormField from '@/components/FormField.vue'

const articles = ref<Article[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const generating = ref(false)
const saving = ref(false)
const sheetOpen = ref(false)
const editingId = ref<string | null>(null)
const fieldErrors = ref<Record<string, string>>({})

function emptyForm() {
  return {
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    cover_image_url: '',
  }
}

const form = reactive(emptyForm())

async function load() {
  loading.value = true
  const { data, error: fetchError } = await supabase
    .from('articles')
    .select('*')
    .order('created_at', { ascending: false })

  if (fetchError) {
    error.value = fetchError.message
  } else {
    articles.value = data as Article[]
  }
  loading.value = false
}

onMounted(load)

async function onGenerate() {
  generating.value = true
  error.value = null

  const { error: invokeError } = await supabase.functions.invoke('generate-article')

  generating.value = false

  if (invokeError) {
    error.value = invokeError.message
    return
  }

  await load()
}

function resetForm() {
  editingId.value = null
  Object.assign(form, emptyForm())
  fieldErrors.value = {}
  error.value = null
}

function openEditSheet(article: Article) {
  resetForm()
  editingId.value = article.id
  form.title = article.title
  form.slug = article.slug
  form.excerpt = article.excerpt
  form.content = article.content
  form.cover_image_url = article.cover_image_url ?? ''
  sheetOpen.value = true
}

function validate(): boolean {
  const errors: Record<string, string> = {}
  if (!form.title.trim()) errors.title = 'Le titre est requis.'
  if (!form.slug.trim()) errors.slug = 'Le slug est requis.'
  if (!form.excerpt.trim()) errors.excerpt = "L'extrait est requis."
  if (!form.content.trim()) errors.content = 'Le contenu est requis.'
  fieldErrors.value = errors
  return Object.keys(errors).length === 0
}

async function onSave() {
  if (!editingId.value) return
  if (!validate()) return

  saving.value = true
  error.value = null

  const { error: saveError } = await supabase
    .from('articles')
    .update({
      title: form.title,
      slug: form.slug,
      excerpt: form.excerpt,
      content: form.content,
      cover_image_url: form.cover_image_url || null,
    })
    .eq('id', editingId.value)

  saving.value = false

  if (saveError) {
    error.value = saveError.message
    return
  }

  sheetOpen.value = false
  resetForm()
  await load()
}

async function onTogglePublish(article: Article) {
  const nextStatus = article.status === 'published' ? 'draft' : 'published'
  const { error: updateError } = await supabase
    .from('articles')
    .update({
      status: nextStatus,
      published_at: nextStatus === 'published' ? new Date().toISOString() : null,
    })
    .eq('id', article.id)

  if (updateError) {
    error.value = updateError.message
    return
  }
  await load()
}

async function onDelete(article: Article) {
  const { error: deleteError } = await supabase.from('articles').delete().eq('id', article.id)
  if (deleteError) {
    error.value = deleteError.message
    return
  }
  await load()
}
</script>

<template>
  <BackButton :to="{ name: 'admin-sets' }" label="Retour aux sets" class="mb-4" />

  <div class="mb-6 flex items-center justify-between">
    <h1 class="text-2xl font-bold">Admin · Articles</h1>
    <Button :disabled="generating" @click="onGenerate">
      <SparklesIcon />
      {{ generating ? 'Génération...' : 'Générer un nouvel article' }}
    </Button>
  </div>

  <p v-if="error" class="mb-4 text-sm text-destructive">{{ error }}</p>
  <p v-if="loading" class="text-muted-foreground">Chargement...</p>
  <p v-else-if="articles.length === 0" class="text-muted-foreground">Aucun article pour le moment.</p>

  <div v-else class="flex flex-col gap-3">
    <Card v-for="article in articles" :key="article.id">
      <CardContent class="flex items-center justify-between gap-4">
        <div class="min-w-0">
          <div class="flex items-center gap-2">
            <p class="truncate font-medium">{{ article.title }}</p>
            <Badge :variant="article.status === 'published' ? 'default' : 'secondary'">
              {{ article.status === 'published' ? 'Publié' : 'Brouillon' }}
            </Badge>
          </div>
          <p class="mt-0.5 truncate text-xs text-muted-foreground">{{ article.excerpt }}</p>
        </div>
        <div class="flex shrink-0 items-center gap-1">
          <Button variant="outline" size="sm" @click="onTogglePublish(article)">
            {{ article.status === 'published' ? 'Dépublier' : 'Publier' }}
          </Button>
          <Button variant="ghost" size="icon" @click="openEditSheet(article)">
            <PencilIcon />
          </Button>
          <ConfirmDeleteDialog
            :title="`Supprimer l'article « ${article.title} » ?`"
            description="Cette action est définitive."
            @confirm="onDelete(article)"
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
        <SheetTitle>Modifier l'article</SheetTitle>
      </SheetHeader>

      <form class="flex flex-1 flex-col overflow-y-auto" @submit.prevent="onSave" novalidate>
        <div class="grid grid-cols-1 gap-3 p-4">
          <FormField label="Titre" for="article-title" required :error="fieldErrors.title">
            <Input id="article-title" v-model="form.title" :aria-invalid="!!fieldErrors.title" />
          </FormField>
          <FormField label="Slug" for="article-slug" required :error="fieldErrors.slug">
            <Input id="article-slug" v-model="form.slug" :aria-invalid="!!fieldErrors.slug" />
          </FormField>
          <FormField label="Extrait" for="article-excerpt" required :error="fieldErrors.excerpt">
            <Textarea id="article-excerpt" v-model="form.excerpt" rows="2" :aria-invalid="!!fieldErrors.excerpt" />
          </FormField>
          <FormField label="URL de l'image de couverture" for="article-cover">
            <Input id="article-cover" v-model="form.cover_image_url" placeholder="Optionnel" />
          </FormField>
          <FormField label="Contenu (markdown)" for="article-content" required :error="fieldErrors.content">
            <Textarea id="article-content" v-model="form.content" rows="14" :aria-invalid="!!fieldErrors.content" />
          </FormField>
        </div>

        <SheetFooter class="border-t">
          <p v-if="error" class="text-sm text-destructive">{{ error }}</p>
          <div class="flex gap-3">
            <Button type="submit" :disabled="saving">
              {{ saving ? 'Enregistrement...' : 'Enregistrer' }}
            </Button>
            <Button type="button" variant="ghost" @click="sheetOpen = false">Annuler</Button>
          </div>
        </SheetFooter>
      </form>
    </SheetContent>
  </Sheet>
</template>
