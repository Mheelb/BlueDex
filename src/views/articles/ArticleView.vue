<script setup lang="ts">
import { computed } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { renderMarkdown } from '@/lib/markdown'
import { useInternalLinkNav } from '@/composables/useInternalLinkNav'
import { articleKeys, fetchArticleBySlug } from '@/queries/articles'
import { SITE_NAME, SITE_URL, absoluteUrl, usePageSeo, useJsonLd } from '@/lib/seo'
import BackButton from '@/components/common/BackButton.vue'
import QueryState from '@/components/common/QueryState.vue'
import Heading from '@/components/common/Heading.vue'
import TextLink from '@/components/common/TextLink.vue'
import { Button } from '@/components/ui/button'

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

// Navigation SPA pour les liens internes du contenu (rendu via v-html).
const onContentClick = useInternalLinkNav()

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
      <div class="prose prose-invert mt-8 max-w-none" @click="onContentClick" v-html="contentHtml" />

      <section class="mt-12 rounded-md border border-primary/30 bg-card p-6 text-center sm:p-9">
        <Heading as="h2" size="lg" class="font-engraved text-foreground">Continue l'exploration</Heading>
        <p class="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Découvre les cartes des sets, construis ton deck ou suis le reste de l'actu Blue Rising.
        </p>
        <div class="mt-6 flex flex-wrap justify-center gap-3">
          <Button
            as-child
            size="lg"
            class="rounded-sm bg-primary font-engraved text-xs font-bold tracking-[0.06em] text-primary-foreground uppercase hover:bg-gold-bright"
          >
            <RouterLink :to="{ name: 'sets' }">Explorer les cartes</RouterLink>
          </Button>
          <Button
            as-child
            size="lg"
            variant="outline"
            class="rounded-sm border-primary/60 bg-transparent font-engraved text-xs font-bold tracking-[0.06em] text-primary uppercase hover:bg-white/5 hover:text-gold-bright"
          >
            <RouterLink :to="{ name: 'deck-builder' }">Construire un deck</RouterLink>
          </Button>
        </div>
        <TextLink :to="{ name: 'articles' }" variant="primary" class="mt-5 inline-block text-xs text-muted-foreground">
          Voir tous les articles
        </TextLink>
      </section>
    </template>
  </QueryState>
</template>
