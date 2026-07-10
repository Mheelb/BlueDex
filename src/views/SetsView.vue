<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { LayersIcon } from '@lucide/vue'
import Autoplay from 'embla-carousel-autoplay'
import { supabase } from '@/lib/supabase'
import type { Card, CardSet } from '@/types/card'
import type { Article } from '@/types/article'
import { Badge } from '@/components/ui/badge'
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from '@/components/ui/carousel'
import HomeHero from '@/components/HomeHero.vue'

const sets = ref<CardSet[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const featuredCards = ref<Card[]>([])
const featuredSetSlug = ref('')
const latestArticles = ref<Article[]>([])

const totalCards = computed(() => sets.value.reduce((sum, s) => sum + s.card_count, 0))

const newestSetId = computed(() => {
  const withDate = sets.value.filter((s) => s.release_date)
  if (withDate.length === 0) return null
  return withDate.reduce((latest, s) => (s.release_date! > latest.release_date! ? s : latest)).id
})

function formatDate(date: string | null) {
  if (!date) return null
  return new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

onMounted(async () => {
  const { data, error: fetchError } = await supabase
    .from('sets')
    .select('*')
    .order('release_date', { ascending: false })

  if (fetchError) {
    error.value = fetchError.message
  } else {
    sets.value = data as CardSet[]
  }
  loading.value = false

  const setWithCards = sets.value.find((s) => s.card_count > 0)
  if (setWithCards) {
    featuredSetSlug.value = setWithCards.slug
    const { data: cardsData } = await supabase
      .from('cards')
      .select('*')
      .eq('set_id', setWithCards.id)
      .order('is_holo', { ascending: false })
      .limit(3)
    featuredCards.value = (cardsData as Card[]) ?? []
  }

  const { data: articlesData } = await supabase
    .from('articles')
    .select('*')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(4)
  latestArticles.value = (articlesData as Article[]) ?? []
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
  <div class="mx-auto max-w-screen-2xl px-4 py-8 sm:px-6 lg:px-8">
    <HomeHero :featured-cards="featuredCards" :featured-set-slug="featuredSetSlug" :total-cards="totalCards" />

    <p v-if="loading" class="text-muted-foreground">Chargement...</p>
    <p v-else-if="error" class="text-destructive">{{ error }}</p>
    <p v-else-if="sets.length === 0" class="text-muted-foreground">Aucun set pour le moment.</p>

    <div v-else>
      <div v-if="latestArticles.length > 0" class="mb-10">
        <div class="mb-4 flex items-center justify-between">
          <h2 class="text-lg font-semibold">À la une</h2>
          <RouterLink :to="{ name: 'articles' }" class="text-sm text-primary hover:underline">
            Tous les articles
          </RouterLink>
        </div>

        <Carousel
          :opts="{ loop: true, align: 'start' }"
          :plugins="[Autoplay({ delay: 5000, stopOnInteraction: false })]"
          class="w-full"
          @init-api="onArticlesInitApi"
        >
          <CarouselContent>
            <CarouselItem
              v-for="(article, index) in latestArticles"
              :key="article.id"
              class="basis-full sm:basis-1/2 lg:basis-1/3"
            >
              <RouterLink
                :to="{ name: 'article', params: { slug: article.slug } }"
                class="group block overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-md"
              >
                <div class="relative aspect-video overflow-hidden bg-gradient-to-br from-primary to-primary/70">
                  <Badge v-if="index === 0" class="absolute top-3 right-3 z-10 bg-white text-primary">
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
                  <p class="line-clamp-1 font-medium group-hover:underline">{{ article.title }}</p>
                  <p class="mt-1 line-clamp-2 text-xs text-muted-foreground">{{ article.excerpt }}</p>
                </div>
              </RouterLink>
            </CarouselItem>
          </CarouselContent>
        </Carousel>

        <div v-if="latestArticles.length > 1" class="mt-4 flex justify-center">
          <div class="flex items-center gap-2 rounded-full border bg-card px-3 py-2 shadow-sm">
            <button
              v-for="(article, index) in latestArticles"
              :key="article.id"
              type="button"
              class="flex size-6 items-center justify-center"
              :aria-label="`Aller à ${article.title}`"
              @click="goToArticleSlide(index)"
            >
              <span
                class="size-2.5 rounded-full transition-colors"
                :class="articlesSelectedIndex === index ? 'bg-primary' : 'bg-muted-foreground/30'"
              />
            </button>
          </div>
        </div>
      </div>

      <h2 class="mb-4 text-lg font-semibold">Sets</h2>

      <Carousel
        :opts="{ loop: true, align: 'start' }"
        :plugins="[Autoplay({ delay: 5000, stopOnInteraction: false })]"
        class="w-full"
        @init-api="onSetsInitApi"
      >
        <CarouselContent>
          <CarouselItem
            v-for="set in sets"
            :key="set.id"
            class="basis-full sm:basis-1/2 lg:basis-1/3"
          >
            <RouterLink :to="{ name: 'set', params: { setSlug: set.slug } }" class="group block">
              <div
                class="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-2xl border bg-gradient-to-br from-primary to-primary/70 shadow-sm transition-shadow duration-300 group-hover:shadow-xl"
              >
                <Badge
                  v-if="set.id === newestSetId"
                  class="absolute top-3 right-3 z-10 bg-white text-primary"
                >
                  Nouveau
                </Badge>

                <img
                  v-if="set.logo_url || set.symbol_url"
                  :src="set.logo_url ?? set.symbol_url ?? undefined"
                  :alt="set.name"
                  class="max-h-[65%] max-w-[70%] object-contain drop-shadow-lg transition-transform duration-300 group-hover:scale-105"
                />
                <LayersIcon v-else class="size-20 text-primary-foreground/30" />
              </div>

              <div class="mt-3">
                <p class="truncate text-lg font-semibold">{{ set.name }}</p>
                <div class="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                  <span v-if="formatDate(set.release_date)">{{ formatDate(set.release_date) }}</span>
                  <span v-if="formatDate(set.release_date)">·</span>
                  <span>{{ set.card_count }} cartes</span>
                </div>
              </div>
            </RouterLink>
          </CarouselItem>
        </CarouselContent>
      </Carousel>

      <div v-if="sets.length > 1" class="mt-6 flex justify-center">
        <div class="flex items-center gap-2 rounded-full border bg-card px-3 py-2 shadow-sm">
          <button
            v-for="(set, index) in sets"
            :key="set.id"
            type="button"
            class="flex size-6 items-center justify-center"
            :aria-label="`Aller à ${set.name}`"
            @click="goToSetSlide(index)"
          >
            <span
              class="size-2.5 rounded-full transition-colors"
              :class="setsSelectedIndex === index ? 'bg-primary' : 'bg-muted-foreground/30'"
            />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
