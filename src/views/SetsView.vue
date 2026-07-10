<script setup lang="ts">
import { computed, ref } from 'vue'
import Autoplay from 'embla-carousel-autoplay'
import { useQuery } from '@tanstack/vue-query'
import { Badge } from '@/components/ui/badge'
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from '@/components/ui/carousel'
import { fetchSets, setKeys } from '@/queries/sets'
import { articleKeys, fetchPublishedArticles } from '@/queries/articles'
import { cardKeys, fetchFeaturedCards } from '@/queries/cards'
import HomeHero from '@/components/HomeHero.vue'
import SetCard from '@/components/SetCard.vue'
import QueryState from '@/components/QueryState.vue'
import Heading from '@/components/Heading.vue'
import TextLink from '@/components/TextLink.vue'

const { data: sets, isPending: loading, error } = useQuery({
  queryKey: setKeys.list('release_date'),
  queryFn: () => fetchSets('release_date'),
})

const totalCards = computed(() => (sets.value ?? []).reduce((sum, s) => sum + s.card_count, 0))

const newestSetId = computed(() => {
  const withDate = (sets.value ?? []).filter((s) => s.release_date)
  if (withDate.length === 0) return null
  return withDate.reduce((latest, s) => (s.release_date! > latest.release_date! ? s : latest)).id
})

const setWithCards = computed(() => (sets.value ?? []).find((s) => s.card_count > 0))
const featuredSetSlug = computed(() => setWithCards.value?.slug ?? '')

const { data: featuredCards } = useQuery({
  queryKey: computed(() => cardKeys.featured(setWithCards.value?.id ?? '')),
  queryFn: () => fetchFeaturedCards(setWithCards.value!.id, 3),
  enabled: computed(() => !!setWithCards.value),
})

const { data: latestArticles } = useQuery({
  queryKey: articleKeys.published(4),
  queryFn: () => fetchPublishedArticles(4),
})

const setsCarouselApi = ref<CarouselApi>()
const setsSelectedIndex = ref(0)

function onSetsInitApi(api: CarouselApi) {
  setsCarouselApi.value = api
  api?.on('select', () => {
    setsSelectedIndex.value = api.selectedScrollSnap()
  })
}

function goToSetSlide(index: number) {
  setsCarouselApi.value?.scrollTo(index)
}

const articlesCarouselApi = ref<CarouselApi>()
const articlesSelectedIndex = ref(0)

function onArticlesInitApi(api: CarouselApi) {
  articlesCarouselApi.value = api
  api?.on('select', () => {
    articlesSelectedIndex.value = api.selectedScrollSnap()
  })
}

function goToArticleSlide(index: number) {
  articlesCarouselApi.value?.scrollTo(index)
}
</script>

<template>
  <HomeHero :featured-cards="featuredCards ?? []" :featured-set-slug="featuredSetSlug" :total-cards="totalCards" />

  <QueryState :loading="loading" :error="error?.message" :empty="sets?.length === 0" empty-message="Aucun set pour le moment.">
    <div class="rounded-md border border-primary/30 bg-card p-6 sm:p-9">
      <div v-if="(latestArticles ?? []).length > 0" class="mb-9 border-b border-primary/20 pb-9">
        <div class="mb-5 flex items-center justify-between">
          <Heading as="h2" size="lg" class="font-engraved text-foreground">À la une</Heading>
          <TextLink
            :to="{ name: 'articles' }"
            variant="primary"
            class="font-engraved text-xs font-bold tracking-[0.05em] text-gold-bright uppercase"
          >
            Tous les articles
          </TextLink>
        </div>

        <Carousel
          :opts="{ loop: true, align: 'start' }"
          :plugins="[Autoplay({ delay: 5000, stopOnInteraction: false })]"
          class="w-full"
          @init-api="onArticlesInitApi"
        >
          <CarouselContent class="pt-2">
            <CarouselItem
              v-for="(article, index) in latestArticles ?? []"
              :key="article.id"
              class="basis-full sm:basis-1/2 lg:basis-1/3"
            >
              <RouterLink
                :to="{ name: 'article', params: { slug: article.slug } }"
                class="group block overflow-hidden rounded-md border border-primary/25 bg-secondary transition-shadow hover:shadow-md"
              >
                <div class="relative aspect-video overflow-hidden bg-gradient-to-br from-secondary to-background">
                  <Badge v-if="index === 0" class="absolute top-3 right-3 z-10 bg-accent text-accent-foreground">
                    Nouveau
                  </Badge>
                  <img
                    v-if="article.cover_image_url"
                    :src="article.cover_image_url"
                    :alt="article.title"
                    class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <div class="p-3">
                  <p class="line-clamp-1 font-medium text-foreground group-hover:underline">{{ article.title }}</p>
                  <p class="mt-1 line-clamp-2 text-xs text-muted-foreground">{{ article.excerpt }}</p>
                </div>
              </RouterLink>
            </CarouselItem>
          </CarouselContent>
        </Carousel>

        <div v-if="(latestArticles ?? []).length > 1" class="mt-4 flex justify-center">
          <div class="flex items-center gap-2 rounded-full border border-primary/30 bg-secondary px-3 py-2">
            <button
              v-for="(article, index) in latestArticles ?? []"
              :key="article.id"
              type="button"
              class="flex size-6 items-center justify-center"
              :aria-label="`Aller à ${article.title}`"
              @click="goToArticleSlide(index)"
            >
              <span
                class="size-2.5 rounded-full transition-colors"
                :class="articlesSelectedIndex === index ? 'bg-gold-bright' : 'bg-primary/25'"
              />
            </button>
          </div>
        </div>
      </div>

      <Heading as="h2" size="lg" class="mb-5 font-engraved text-foreground">Sets</Heading>

      <Carousel
        :opts="{ loop: true, align: 'start' }"
        :plugins="[Autoplay({ delay: 5000, stopOnInteraction: false })]"
        class="w-full"
        @init-api="onSetsInitApi"
      >
        <CarouselContent class="pt-2">
          <CarouselItem
            v-for="set in sets ?? []"
            :key="set.id"
            class="basis-full sm:basis-1/2 lg:basis-1/3"
          >
            <SetCard :set="set" :is-new="set.id === newestSetId" />
          </CarouselItem>
        </CarouselContent>
      </Carousel>

      <div v-if="(sets ?? []).length > 1" class="mt-6 flex justify-center">
        <div class="flex items-center gap-2 rounded-full border border-primary/30 bg-secondary px-3 py-2">
          <button
            v-for="(set, index) in sets ?? []"
            :key="set.id"
            type="button"
            class="flex size-6 items-center justify-center"
            :aria-label="`Aller à ${set.name}`"
            @click="goToSetSlide(index)"
          >
            <span
              class="size-2.5 rounded-full transition-colors"
              :class="setsSelectedIndex === index ? 'bg-gold-bright' : 'bg-primary/25'"
            />
          </button>
        </div>
      </div>
    </div>
  </QueryState>
</template>
