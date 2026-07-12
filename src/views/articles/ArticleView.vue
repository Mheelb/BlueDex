<script setup lang="ts">
import { computed } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { renderMarkdown } from '@/lib/markdown'
import { articleKeys, fetchArticleBySlug } from '@/queries/articles'
import { SITE_NAME, SITE_URL, absoluteUrl, usePageSeo, useJsonLd } from '@/lib/seo'
import BackButton from '@/components/common/BackButton.vue'
import QueryState from '@/components/common/QueryState.vue'
import Heading from '@/components/common/Heading.vue'

const props = defineProps<{ slug: string }>()

const {
  data: article,
  isPending: loading,
  error,
} = useQuery({
  queryKey: computed(() => articleKeys.detail(props.slug)),
  queryFn: () => fetchArticleBySlug(props.slug),
})

const contentHtml = computed(() => (article.value ? renderMarkdown(article.value.content) : ''))

usePageSeo({
  title: () => article.value?.title,
  description: () => article.value?.excerpt,
  path: () => `/actus/${props.slug}`,
  image: () => article.value?.cover_image_url ?? undefined,
  type: 'article',
})

useJsonLd(() => {
  const a = article.value
  if (!a) return null
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: a.title,
    description: a.excerpt,
    image: a.cover_image_url ? [absoluteUrl(a.cover_image_url)] : undefined,
    datePublished: a.published_at ?? a.created_at,
    dateModified: a.published_at ?? a.created_at,
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${SITE_URL}/actus/${a.slug}` },
    author: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
    },
  }
})

function formatDate(date: string | null) {
  if (!date) return ''
  return new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}
</script>

<template>
  <QueryState :loading="loading" :error="error?.message">
    <template v-if="article">
      <BackButton :to="{ name: 'articles' }" label="Retour aux actus" class="mb-6" />

      <p class="text-sm text-muted-foreground">
        <time :datetime="article.published_at ?? article.created_at">{{ formatDate(article.published_at) }}</time>
      </p>
      <Heading class="mt-1">{{ article.title }}</Heading>

      <img
        v-if="article.cover_image_url"
        :src="article.cover_image_url"
        :alt="article.title"
        class="mt-6 aspect-video w-full rounded-xl bg-gradient-to-br from-primary to-primary/70 object-cover"
      />

      <!-- eslint-disable-next-line vue/no-v-html -- contentHtml is sanitized via DOMPurify in renderMarkdown -->
      <div class="prose prose-invert mt-8 max-w-none" v-html="contentHtml" />
    </template>
  </QueryState>
</template>
