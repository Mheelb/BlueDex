<script setup lang="ts">
import { NewspaperIcon } from '@lucide/vue'
import { useQuery } from '@tanstack/vue-query'
import { articleKeys, fetchPublishedArticles } from '@/queries/articles'
import QueryState from '@/components/QueryState.vue'

const { data: articles, isPending: loading, error } = useQuery({
  queryKey: articleKeys.published(),
  queryFn: () => fetchPublishedArticles(),
})

function formatDate(date: string | null) {
  if (!date) return ''
  return new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}
</script>

<template>
  <h1 class="text-3xl font-bold">Actus</h1>
  <p class="mt-1 text-sm text-muted-foreground">Cartes, factions, decks : les derniers articles autour de Blue Rising.</p>

  <QueryState
    class="mt-8"
    :loading="loading"
    :error="error?.message"
    :empty="articles?.length === 0"
    empty-message="Aucun article pour le moment."
  >
    <div class="mt-8 flex flex-col gap-6">
      <RouterLink
        v-for="article in articles ?? []"
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
  </QueryState>
</template>
