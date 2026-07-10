<script setup lang="ts">
import { ref } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { useForm } from '@tanstack/vue-form'
import { PencilIcon, SparklesIcon, Trash2Icon } from '@lucide/vue'
import { supabase } from '@/lib/supabase'
import type { Article } from '@/types/article'
import { articleKeys, fetchAdminArticles } from '@/queries/articles'
import { required } from '@/lib/formValidators'
import BackButton from '@/components/BackButton.vue'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import ConfirmDeleteDialog from '@/components/ConfirmDeleteDialog.vue'
import FormField from '@/components/FormField.vue'
import PageHeader from '@/components/PageHeader.vue'
import QueryState from '@/components/QueryState.vue'

const queryClient = useQueryClient()

const { data: articles, isPending: loading } = useQuery({
  queryKey: articleKeys.admin(),
  queryFn: fetchAdminArticles,
})

const error = ref<string | null>(null)
const sheetOpen = ref(false)
const editingId = ref<string | null>(null)

function emptyForm() {
  return {
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    cover_image_url: '',
  }
}

const generateMutation = useMutation({
  mutationFn: async () => {
    const { error: invokeError } = await supabase.functions.invoke('generate-article')
    if (invokeError) throw new Error(invokeError.message)
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: articleKeys.all })
  },
  onError: (err) => {
    error.value = err.message
  },
})

function onGenerate() {
  error.value = null
  generateMutation.mutate()
}

const saveMutation = useMutation({
  mutationFn: async (value: ReturnType<typeof emptyForm>) => {
    const { error: saveError } = await supabase
      .from('articles')
      .update({
        title: value.title,
        slug: value.slug,
        excerpt: value.excerpt,
        content: value.content,
        cover_image_url: value.cover_image_url || null,
      })
      .eq('id', editingId.value)

    if (saveError) throw new Error(saveError.message)
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: articleKeys.all })
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
    if (!editingId.value) return
    await saveMutation.mutateAsync(value)
  },
})

function resetForm() {
  editingId.value = null
  form.reset(emptyForm())
  error.value = null
}

const validateExcerpt = required("L'extrait est requis.")

function openEditSheet(article: Article) {
  resetForm()
  editingId.value = article.id
  form.reset({
    title: article.title,
    slug: article.slug,
    excerpt: article.excerpt,
    content: article.content,
    cover_image_url: article.cover_image_url ?? '',
  })
  sheetOpen.value = true
}

const togglePublishMutation = useMutation({
  mutationFn: async (article: Article) => {
    const nextStatus = article.status === 'published' ? 'draft' : 'published'
    const { error: updateError } = await supabase
      .from('articles')
      .update({
        status: nextStatus,
        published_at: nextStatus === 'published' ? new Date().toISOString() : null,
      })
      .eq('id', article.id)

    if (updateError) throw new Error(updateError.message)
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: articleKeys.all })
  },
  onError: (err) => {
    error.value = err.message
  },
})

function onTogglePublish(article: Article) {
  togglePublishMutation.mutate(article)
}

const deleteMutation = useMutation({
  mutationFn: async (article: Article) => {
    const { error: deleteError } = await supabase.from('articles').delete().eq('id', article.id)
    if (deleteError) throw new Error(deleteError.message)
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: articleKeys.all })
  },
  onError: (err) => {
    error.value = err.message
  },
})

function onDelete(article: Article) {
  deleteMutation.mutate(article)
}
</script>

<template>
  <BackButton :to="{ name: 'admin-sets' }" label="Retour aux sets" class="mb-4" />

  <PageHeader title="Admin · Articles">
    <Button :disabled="generateMutation.isPending.value" @click="onGenerate">
      <SparklesIcon />
      {{ generateMutation.isPending.value ? 'Génération...' : 'Générer un nouvel article' }}
    </Button>
  </PageHeader>

  <p v-if="error" class="mb-4 text-sm text-destructive">{{ error }}</p>

  <QueryState :loading="loading" :empty="articles?.length === 0" empty-message="Aucun article pour le moment.">
    <div class="flex flex-col gap-3">
      <Card v-for="article in articles ?? []" :key="article.id">
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
  </QueryState>

  <Sheet v-model:open="sheetOpen">
    <SheetContent class="flex w-full flex-col gap-0 sm:max-w-xl">
      <SheetHeader class="border-b">
        <SheetTitle>Modifier l'article</SheetTitle>
      </SheetHeader>

      <form class="flex flex-1 flex-col overflow-y-auto" @submit.prevent="() => form.handleSubmit()" novalidate>
        <div class="grid grid-cols-1 gap-3 p-4">
          <form.Field name="title" :validators="{ onChange: required('Le titre est requis.') }" v-slot="{ field }">
            <FormField label="Titre" for="article-title" required :error="field.state.meta.errors[0]">
              <Input
                id="article-title"
                :model-value="field.state.value"
                :aria-invalid="field.state.meta.errors.length > 0"
                @update:model-value="(v) => field.handleChange(String(v))"
                @blur="field.handleBlur"
              />
            </FormField>
          </form.Field>
          <form.Field name="slug" :validators="{ onChange: required('Le slug est requis.') }" v-slot="{ field }">
            <FormField label="Slug" for="article-slug" required :error="field.state.meta.errors[0]">
              <Input
                id="article-slug"
                :model-value="field.state.value"
                :aria-invalid="field.state.meta.errors.length > 0"
                @update:model-value="(v) => field.handleChange(String(v))"
                @blur="field.handleBlur"
              />
            </FormField>
          </form.Field>
          <form.Field name="excerpt" :validators="{ onChange: validateExcerpt }" v-slot="{ field }">
            <FormField label="Extrait" for="article-excerpt" required :error="field.state.meta.errors[0]">
              <Textarea
                id="article-excerpt"
                :model-value="field.state.value"
                rows="2"
                :aria-invalid="field.state.meta.errors.length > 0"
                @update:model-value="(v) => field.handleChange(String(v))"
                @blur="field.handleBlur"
              />
            </FormField>
          </form.Field>
          <form.Field name="cover_image_url" v-slot="{ field }">
            <FormField label="URL de l'image de couverture" for="article-cover">
              <Input
                id="article-cover"
                :model-value="field.state.value"
                placeholder="Optionnel"
                @update:model-value="(v) => field.handleChange(String(v))"
              />
            </FormField>
          </form.Field>
          <form.Field name="content" :validators="{ onChange: required('Le contenu est requis.') }" v-slot="{ field }">
            <FormField label="Contenu (markdown)" for="article-content" required :error="field.state.meta.errors[0]">
              <Textarea
                id="article-content"
                :model-value="field.state.value"
                rows="14"
                :aria-invalid="field.state.meta.errors.length > 0"
                @update:model-value="(v) => field.handleChange(String(v))"
                @blur="field.handleBlur"
              />
            </FormField>
          </form.Field>
        </div>

        <SheetFooter class="border-t">
          <p v-if="error" class="text-sm text-destructive">{{ error }}</p>
          <div class="flex gap-3">
            <Button type="submit" :disabled="saveMutation.isPending.value">
              {{ saveMutation.isPending.value ? 'Enregistrement...' : 'Enregistrer' }}
            </Button>
            <Button type="button" variant="ghost" @click="sheetOpen = false">Annuler</Button>
          </div>
        </SheetFooter>
      </form>
    </SheetContent>
  </Sheet>
</template>
