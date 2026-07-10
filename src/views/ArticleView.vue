<script setup lang="ts">
import { computed } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { renderMarkdown } from '@/lib/markdown'
import { articleKeys, fetchArticleBySlug } from '@/queries/articles'
import BackButton from '@/components/BackButton.vue'
import QueryState from '@/components/QueryState.vue'
import Heading from '@/components/Heading.vue'

const props = defineProps<{ slug: string }>()

const { data: article, isPending: loading, error } = useQuery({
  queryKey: computed(() => articleKeys.detail(props.slug)),
  queryFn: () => fetchArticleBySlug(props.slug),
})

const contentHtml = computed(() => (article.value ? renderMarkdown(article.value.content) : ''))

function formatDate(date: string | null) {
  if (!date) return ''
  return new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}
</script>

<template>
  <QueryState :loading="loading" :error="error?.message">
    <template v-if="article">
      <BackButton :to="{ name: 'articles' }" label="Retour aux actus" class="mb-6" />

      <p class="text-sm text-muted-foreground">{{ formatDate(article.published_at) }}</p>
      <Heading class="mt-1">{{ article.title }}</Heading>

      <img
        v-if="article.cover_image_url"
        :src="article.cover_image_url"
        :alt="article.title"
        class="mt-6 aspect-video w-full rounded-xl bg-gradient-to-br from-primary to-primary/70 object-cover"
      />

      <div class="prose prose-invert mt-8 max-w-none" v-html="contentHtml" />
    </template>
  </QueryState>
</template>
