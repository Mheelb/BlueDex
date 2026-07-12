<script setup lang="ts">
import { computed, ref } from 'vue'
import Autoplay from 'embla-carousel-autoplay'
import { useQuery } from '@tanstack/vue-query'
import { Badge } from '@/components/ui/badge'
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from '@/components/ui/carousel'
import { Separator } from '@/components/ui/separator'
import { fetchSets, setKeys } from '@/queries/sets'
import { articleKeys, fetchPublishedArticles } from '@/queries/articles'
import { cardKeys, fetchFeaturedCards } from '@/queries/cards'
import { withLoopPadding } from '@/lib/carouselLoop'
import { usePageSeo } from '@/lib/seo'
import HomeHero from '@/components/home/HomeHero.vue'
import SetCard from '@/components/sets/SetCard.vue'
import QueryState from '@/components/common/QueryState.vue'
import Heading from '@/components/common/Heading.vue'
import TextLink from '@/components/common/TextLink.vue'

usePageSeo({ path: '/' })

const {
  data: sets,
  isPending: loading,
  error,
} = useQuery({
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

const paddedSets = computed(() => withLoopPadding(sets.value ?? []))
const setsLoop = computed(() => (sets.value?.length ?? 0) > 1)

const paddedArticles = computed(() => withLoopPadding(latestArticles.value ?? []))
const articlesLoop = computed(() => (latestArticles.value?.length ?? 0) > 1)

const setsCarouselApi = ref<CarouselApi>()
const setsSelectedIndex = ref(0)

function onSetsInitApi(api: CarouselApi) {
  setsCarouselApi.value = api
  api?.on('select', () => {
    const realCount = sets.value?.length || 1
    setsSelectedIndex.value = api.selectedScrollSnap() % realCount
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
    const realCount = latestArticles.value?.length || 1
    articlesSelectedIndex.value = api.selectedScrollSnap() % realCount
  })
}

function goToArticleSlide(index: number) {
  articlesCarouselApi.value?.scrollTo(index)
}
</script>

<template>
  <HomeHero :featured-cards="featuredCards ?? []" :featured-set-slug="featuredSetSlug" :total-cards="totalCards" />

  <QueryState
    :loading="loading"
    :error="error?.message"
    :empty="sets?.length === 0"
    empty-message="Aucun set pour le moment."
  >
    <div class="rounded-md border border-primary/30 bg-card p-6 sm:p-9">
      <div
        v-if="(latestArticles ?? []).length > 0"
        class="animate-in fade-in-0 slide-in-from-bottom-2 duration-500 ease-out"
      >
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
          :opts="{ loop: articlesLoop, align: 'start' }"
          :plugins="[Autoplay({ delay: 5000, stopOnInteraction: false })]"
          class="w-full"
          @init-api="onArticlesInitApi"
        >
          <CarouselContent class="pt-2">
            <CarouselItem
              v-for="(slide, slideIndex) in paddedArticles"
              :key="`${slide.item.id}-${slideIndex}`"
              class="basis-full sm:basis-1/2 lg:basis-1/3"
            >
              <RouterLink
                :to="{ name: 'article', params: { slug: slide.item.slug } }"
                class="group block overflow-hidden rounded-md border border-primary/25 bg-secondary transition-shadow hover:shadow-md"
              >
                <div class="relative aspect-video overflow-hidden bg-gradient-to-br from-secondary to-background">
                  <Badge
                    v-if="slide.originalIndex === 0"
                    class="absolute top-3 right-3 z-10 bg-accent text-accent-foreground"
                  >
                    Nouveau
                  </Badge>
                  <img
                    v-if="slide.item.cover_image_url"
                    :src="slide.item.cover_image_url"
                    :alt="slide.item.title"
                    class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <div class="p-3">
                  <p class="line-clamp-1 font-medium text-foreground group-hover:underline">{{ slide.item.title }}</p>
                  <p class="mt-1 line-clamp-2 text-xs text-muted-foreground">{{ slide.item.excerpt }}</p>
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

        <Separator ornament class="mt-9 mb-9" />
      </div>

      <Heading
        as="h2"
        size="lg"
        class="mb-5 animate-in fade-in-0 slide-in-from-bottom-2 font-engraved text-foreground delay-150 duration-500 ease-out fill-mode-backwards"
      >
        Sets
      </Heading>

      <Carousel
        :opts="{ loop: setsLoop, align: 'start' }"
        :plugins="[Autoplay({ delay: 5000, stopOnInteraction: false })]"
        class="w-full animate-in fade-in-0 slide-in-from-bottom-2 delay-150 duration-500 ease-out fill-mode-backwards"
        @init-api="onSetsInitApi"
      >
        <CarouselContent class="pt-2">
          <CarouselItem
            v-for="(slide, slideIndex) in paddedSets"
            :key="`${slide.item.id}-${slideIndex}`"
            class="basis-full sm:basis-1/2 lg:basis-1/3"
          >
            <SetCard :set="slide.item" :is-new="slide.item.id === newestSetId" />
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
