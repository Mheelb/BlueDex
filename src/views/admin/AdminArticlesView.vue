<script setup lang="ts">
import { ref } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { useForm } from '@tanstack/vue-form'
import { PencilIcon, SparklesIcon, Trash2Icon } from '@lucide/vue'
import { toast } from 'vue-sonner'
import { supabase } from '@/lib/supabase'
import type { Article } from '@/types/article'
import { articleKeys, fetchAdminArticles } from '@/queries/articles'
import { required } from '@/lib/formValidators'
import BackButton from '@/components/common/BackButton.vue'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import ConfirmDeleteDialog from '@/components/common/ConfirmDeleteDialog.vue'
import FormField from '@/components/form/FormField.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import QueryState from '@/components/common/QueryState.vue'
import RebuildSiteButton from '@/components/admin/RebuildSiteButton.vue'

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

const generateSheetOpen = ref(false)
const genSubject = ref('')
const genSources = ref('')

const generateMutation = useMutation({
  mutationFn: async (payload: { subject: string; sources: string[] }) => {
    const { error: invokeError } = await supabase.functions.invoke('generate-article', { body: payload })
    if (invokeError) throw new Error(invokeError.message)
  },
  onSuccess: () => {
    // La génération tourne en tâche de fond côté edge function : la réponse est
    // immédiate, l'article (brouillon) n'existe pas encore. On rafraîchit la
    // liste un peu plus tard, le temps que la génération se termine.
    generateSheetOpen.value = false
    genSubject.value = ''
    genSources.value = ''
    toast.success('Génération lancée', {
      description: "L'article (brouillon) apparaîtra ici dans une à deux minutes.",
    })
    setTimeout(() => queryClient.invalidateQueries({ queryKey: articleKeys.all }), 60_000)
    setTimeout(() => queryClient.invalidateQueries({ queryKey: articleKeys.all }), 120_000)
  },
  onError: (err) => {
    error.value = err.message
  },
})

function onGenerate() {
  error.value = null
  const sources = genSources.value
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
  generateMutation.mutate({ subject: genSubject.value.trim(), sources })
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
    <div class="flex gap-2">
      <RebuildSiteButton />
      <Button @click="generateSheetOpen = true">
        <SparklesIcon />
        Générer un nouvel article
      </Button>
    </div>
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

  <Sheet v-model:open="generateSheetOpen">
    <SheetContent class="flex w-full flex-col gap-0 sm:max-w-lg">
      <SheetHeader>
        <SheetTitle>Générer un article</SheetTitle>
      </SheetHeader>
      <Separator />

      <div class="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
        <div>
          <label for="gen-subject" class="mb-1 block text-sm font-medium">
            Sujet <span class="text-muted-foreground">(optionnel)</span>
          </label>
          <Textarea
            id="gen-subject"
            v-model="genSubject"
            rows="3"
            placeholder="Laisse vide pour que l'IA choisisse le sujet. Ex : Le matchup Gardien vs Veilleur, les meilleures cartes Émissaire…"
          />
        </div>

        <div>
          <label for="gen-sources" class="mb-1 block text-sm font-medium">
            Sources <span class="text-muted-foreground">(optionnel)</span>
          </label>
          <Textarea id="gen-sources" v-model="genSources" rows="4" placeholder="Une URL par ligne." />
          <p class="mt-1 text-xs text-muted-foreground">
            Une URL par ligne. L'IA les lira attentivement — mais complètera toujours avec ses propres recherches.
          </p>
        </div>

        <p class="text-xs text-muted-foreground">
          La génération peut prendre jusqu'à une minute. L'article est créé en brouillon.
        </p>
      </div>

      <Separator />
      <SheetFooter>
        <p v-if="error" class="text-sm text-destructive">{{ error }}</p>
        <div class="flex gap-3">
          <Button :disabled="generateMutation.isPending.value" @click="onGenerate">
            <SparklesIcon />
            {{ generateMutation.isPending.value ? 'Génération…' : 'Générer' }}
          </Button>
          <Button type="button" variant="ghost" @click="generateSheetOpen = false">Annuler</Button>
        </div>
      </SheetFooter>
    </SheetContent>
  </Sheet>

  <Sheet v-model:open="sheetOpen">
    <SheetContent class="flex w-full flex-col gap-0 sm:max-w-xl">
      <SheetHeader>
        <SheetTitle>Modifier l'article</SheetTitle>
      </SheetHeader>
      <Separator />

      <form class="flex flex-1 flex-col overflow-y-auto" novalidate @submit.prevent="() => form.handleSubmit()">
        <div class="grid grid-cols-1 gap-3 p-4">
          <form.Field v-slot="{ field }" name="title" :validators="{ onChange: required('Le titre est requis.') }">
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
          <form.Field v-slot="{ field }" name="slug" :validators="{ onChange: required('Le slug est requis.') }">
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
          <form.Field v-slot="{ field }" name="excerpt" :validators="{ onChange: validateExcerpt }">
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
          <form.Field v-slot="{ field }" name="cover_image_url">
            <FormField label="URL de l'image de couverture" for="article-cover">
              <Input
                id="article-cover"
                :model-value="field.state.value"
                placeholder="Optionnel"
                @update:model-value="(v) => field.handleChange(String(v))"
              />
            </FormField>
          </form.Field>
          <form.Field v-slot="{ field }" name="content" :validators="{ onChange: required('Le contenu est requis.') }">
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

        <Separator />
        <SheetFooter>
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
