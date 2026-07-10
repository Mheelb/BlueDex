<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { supabase } from '@/lib/supabase'
import type { Article } from '@/types/article'
import { renderMarkdown } from '@/lib/markdown'
import BackButton from '@/components/BackButton.vue'

const props = defineProps<{ slug: string }>()

const article = ref<Article | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

const contentHtml = computed(() => (article.value ? renderMarkdown(article.value.content) : ''))

function formatDate(date: string | null) {
  if (!date) return ''
  return new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

async function load() {
  loading.value = true
  error.value = null

  const { data, error: fetchError } = await supabase
    .from('articles')
    .select('*')
    .eq('slug', props.slug)
    .eq('status', 'published')
    .single()

  if (fetchError || !data) {
    error.value = fetchError?.message ?? 'Article introuvable.'
  } else {
    article.value = data as Article
  }
  loading.value = false
}

onMounted(load)
watch(() => props.slug, load)
</script>

<template>
  <div class="mx-auto max-w-screen-md px-4 py-8 sm:px-6 lg:px-8">
    <p v-if="loading" class="text-muted-foreground">Chargement...</p>
    <p v-else-if="error" class="text-destructive">{{ error }}</p>

    <template v-else-if="article">
      <BackButton :to="{ name: 'articles' }" label="Retour aux actus" class="mb-6" />

      <p class="text-sm text-muted-foreground">{{ formatDate(article.published_at) }}</p>
      <h1 class="mt-1 text-3xl font-bold">{{ article.title }}</h1>

      <img
        v-if="article.cover_image_url"
        :src="article.cover_image_url"
        :alt="article.title"
        class="mt-6 aspect-video w-full rounded-xl bg-gradient-to-br from-primary to-primary/70 object-cover"
      />

      <div class="prose prose-neutral dark:prose-invert mt-8 max-w-none" v-html="contentHtml" />
    </template>
  </div>
</template>
