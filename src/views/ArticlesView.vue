<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { NewspaperIcon } from '@lucide/vue'
import { supabase } from '@/lib/supabase'
import type { Article } from '@/types/article'

const articles = ref<Article[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

function formatDate(date: string | null) {
  if (!date) return ''
  return new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

onMounted(async () => {
  const { data, error: fetchError } = await supabase
    .from('articles')
    .select('*')
    .eq('status', 'published')
    .order('published_at', { ascending: false })

  if (fetchError) {
    error.value = fetchError.message
  } else {
    articles.value = data as Article[]
  }
  loading.value = false
})
</script>

<template>
  <h1 class="text-3xl font-bold">Actus</h1>
  <p class="mt-1 text-sm text-muted-foreground">Cartes, factions, decks : les derniers articles autour de Blue Rising.</p>

  <p v-if="loading" class="mt-8 text-muted-foreground">Chargement...</p>
  <p v-else-if="error" class="mt-8 text-destructive">{{ error }}</p>
  <p v-else-if="articles.length === 0" class="mt-8 text-muted-foreground">Aucun article pour le moment.</p>

  <div v-else class="mt-8 flex flex-col gap-6">
    <RouterLink
      v-for="article in articles"
      :key="article.id"
      :to="{ name: 'article', params: { slug: article.slug } }"
      class="group flex gap-4 rounded-xl border bg-card p-4 transition-colors hover:bg-muted/50"
    >
      <div class="hidden h-24 w-36 shrink-0 overflow-hidden rounded-lg bg-muted sm:block">
        <img
          v-if="article.cover_image_url"
          :src="article.cover_image_url"
          :alt="article.title"
          class="h-full w-full bg-gradient-to-br from-primary to-primary/70 object-cover"
        />
        <div v-else class="flex h-full w-full items-center justify-center text-muted-foreground">
          <NewspaperIcon class="size-8" />
        </div>
      </div>

      <div class="min-w-0">
        <p class="text-xs text-muted-foreground">{{ formatDate(article.published_at) }}</p>
        <h2 class="mt-1 text-lg font-semibold group-hover:underline">{{ article.title }}</h2>
        <p class="mt-1 line-clamp-2 text-sm text-muted-foreground">{{ article.excerpt }}</p>
      </div>
    </RouterLink>
  </div>
</template>
