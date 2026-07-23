<script setup lang="ts">
import { computed, ref } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { toast } from 'vue-sonner'
import { PlusIcon } from '@lucide/vue'
import { useAuthUser } from '@/composables/useAuthUser'
import { SITE_NAME, SITE_URL, usePageSeo, useJsonLd } from '@/lib/seo'
import { toUserMessage } from '@/lib/errorMessage'
import type { DeckListQuery } from '@/types/deck'
import { createEmptyDeckListQuery } from '@/types/deck'
import {
  DECK_LIST_PAGE_SIZE,
  addBookmark,
  addStar,
  deckKeys,
  fetchBookmarkedDeckIds,
  fetchBookmarkedDecks,
  fetchMyDecks,
  fetchPublicDecks,
  fetchStarredDeckIds,
  removeBookmark,
  removeStar,
} from '@/queries/decks'
import PageIntro from '@/components/common/PageIntro.vue'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import DeckTable from '@/components/deckbuilder/DeckTable.vue'
import DeckListControls from '@/components/deckbuilder/DeckListControls.vue'

usePageSeo({
  title: 'Deck Builder Blue Rising',
  description:
    'Le deck builder Blue Rising : assemble tes cartes, respecte les règles du format et partage tes decks avec la communauté du TCG de la Karmine.',
  path: '/decks',
})

useJsonLd({
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Deck Builder Blue Rising',
  applicationCategory: 'GameApplication',
  operatingSystem: 'Web',
  url: `${SITE_URL}/decks`,
  description: 'Construis, partage et explore des decks du jeu de cartes à collectionner Blue Rising.',
  isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: SITE_URL },
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
})

const { session } = useAuthUser()
const queryClient = useQueryClient()
const userId = computed(() => session.value?.user.id)

const publicPage = ref(0)
const myPage = ref(0)
const bookmarkedPage = ref(0)

const publicFilters = ref(createEmptyDeckListQuery())
const myFilters = ref(createEmptyDeckListQuery())
const bookmarkedFilters = ref(createEmptyDeckListQuery())

function updateFilters(target: 'public' | 'mine' | 'bookmarked', value: DeckListQuery) {
  if (target === 'public') {
    publicFilters.value = value
    publicPage.value = 0
  } else if (target === 'mine') {
    myFilters.value = value
    myPage.value = 0
  } else {
    bookmarkedFilters.value = value
    bookmarkedPage.value = 0
  }
}

const {
  data: publicData,
  isPending: publicLoading,
  error: publicError,
} = useQuery({
  queryKey: computed(() => deckKeys.publicList(publicPage.value, publicFilters.value)),
  queryFn: () => fetchPublicDecks(publicPage.value, publicFilters.value),
})

const {
  data: myData,
  isPending: myLoading,
  error: myError,
} = useQuery({
  queryKey: computed(() => deckKeys.myList(userId.value ?? '', myPage.value, myFilters.value)),
  queryFn: () => fetchMyDecks(userId.value!, myPage.value, myFilters.value),
  enabled: computed(() => !!userId.value),
})

const { data: bookmarkedIds } = useQuery({
  queryKey: computed(() => deckKeys.bookmarkedIds(userId.value ?? '')),
  queryFn: () => fetchBookmarkedDeckIds(userId.value!),
  enabled: computed(() => !!userId.value),
})

const bookmarkedIdSet = computed(() => bookmarkedIds.value ?? new Set<string>())

const { data: starredIds } = useQuery({
  queryKey: computed(() => deckKeys.starredIds(userId.value ?? '')),
  queryFn: () => fetchStarredDeckIds(userId.value!),
  enabled: computed(() => !!userId.value),
})

const starredIdSet = computed(() => starredIds.value ?? new Set<string>())

const {
  data: bookmarkedData,
  isPending: bookmarkedLoading,
  error: bookmarkedError,
} = useQuery({
  queryKey: computed(() => deckKeys.bookmarkedList(userId.value ?? '', bookmarkedPage.value, bookmarkedFilters.value)),
  queryFn: () => fetchBookmarkedDecks([...bookmarkedIdSet.value], bookmarkedPage.value, bookmarkedFilters.value),
  enabled: computed(() => !!userId.value && bookmarkedIds.value !== undefined),
})

function pageCount(total: number | undefined) {
  return Math.max(1, Math.ceil((total ?? 0) / DECK_LIST_PAGE_SIZE))
}

const bookmarkMutation = useMutation({
  mutationFn: async (deckId: string) => {
    if (!userId.value) throw new Error('Connecte-toi pour bookmarker un deck.')
    if (bookmarkedIdSet.value.has(deckId)) {
      await removeBookmark(deckId, userId.value)
    } else {
      await addBookmark(deckId, userId.value)
    }
  },
  onSuccess: async () => {
    if (userId.value) {
      await queryClient.invalidateQueries({ queryKey: deckKeys.bookmarkedIds(userId.value) })
    }
    queryClient.invalidateQueries({ queryKey: deckKeys.all })
  },
  onError: (err) => {
    toast.error(toUserMessage(err))
  },
})

function onToggleBookmark(deckId: string) {
  bookmarkMutation.mutate(deckId)
}

const starMutation = useMutation({
  mutationFn: async (deckId: string) => {
    if (!userId.value) throw new Error('Connecte-toi pour voter pour un deck.')
    if (starredIdSet.value.has(deckId)) {
      await removeStar(deckId, userId.value)
    } else {
      await addStar(deckId, userId.value)
    }
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: deckKeys.all })
  },
  onError: (err) => {
    toast.error(toUserMessage(err))
  },
})

function onToggleStar(deckId: string) {
  starMutation.mutate(deckId)
}
</script>

<template>
  <PageIntro
    eyebrow="Deck Builder"
    title="Construis ton deck"
    description="Assemble tes cartes, respecte les règles du format et partage tes decks avec la communauté Blue Rising."
  >
    <template #actions>
      <Button as-child size="lg" class="shrink-0 bg-primary text-primary-foreground hover:bg-gold-bright">
        <RouterLink :to="{ name: 'deck-builder-new' }">
          <PlusIcon />
          Créer un deck
        </RouterLink>
      </Button>
    </template>
  </PageIntro>

  <Tabs default-value="public">
    <TabsList>
      <TabsTrigger value="public">Decks publics</TabsTrigger>
      <TabsTrigger value="mine">Mes decks</TabsTrigger>
      <TabsTrigger value="bookmarked">Decks enregistrés</TabsTrigger>
    </TabsList>

    <TabsContent value="public">
      <DeckListControls :model-value="publicFilters" @update:model-value="updateFilters('public', $event)" />
      <DeckTable
        :rows="publicData?.rows ?? []"
        :loading="publicLoading"
        :error="publicError?.message ?? null"
        :page-index="publicPage"
        :page-size="DECK_LIST_PAGE_SIZE"
        :page-count="pageCount(publicData?.total)"
        show-author
        :bookmarked-ids="bookmarkedIdSet"
        :starred-ids="starredIdSet"
        :current-user-id="userId"
        empty-message="Aucun deck public pour le moment."
        @update:page-index="publicPage = $event"
        @toggle-bookmark="onToggleBookmark"
        @toggle-star="onToggleStar"
      />
    </TabsContent>

    <TabsContent value="mine">
      <div v-if="!userId" class="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        <RouterLink :to="{ name: 'login' }" class="text-primary hover:underline">Connecte-toi</RouterLink>
        pour voir tes decks.
      </div>
      <template v-else>
        <DeckListControls :model-value="myFilters" @update:model-value="updateFilters('mine', $event)" />
        <DeckTable
          :rows="myData?.rows ?? []"
          :loading="myLoading"
          :error="myError?.message ?? null"
          :page-index="myPage"
          :page-size="DECK_LIST_PAGE_SIZE"
          :page-count="pageCount(myData?.total)"
          :bookmarked-ids="bookmarkedIdSet"
          :starred-ids="starredIdSet"
          :current-user-id="userId"
          empty-message="Tu n'as pas encore de deck. Crée-en un !"
          @update:page-index="myPage = $event"
          @toggle-bookmark="onToggleBookmark"
          @toggle-star="onToggleStar"
        />
      </template>
    </TabsContent>

    <TabsContent value="bookmarked">
      <div v-if="!userId" class="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        <RouterLink :to="{ name: 'login' }" class="text-primary hover:underline">Connecte-toi</RouterLink>
        pour voir tes decks enregistrés.
      </div>
      <template v-else>
        <DeckListControls :model-value="bookmarkedFilters" @update:model-value="updateFilters('bookmarked', $event)" />
        <DeckTable
          :rows="bookmarkedData?.rows ?? []"
          :loading="bookmarkedLoading"
          :error="bookmarkedError?.message ?? null"
          :page-index="bookmarkedPage"
          :page-size="DECK_LIST_PAGE_SIZE"
          :page-count="pageCount(bookmarkedData?.total)"
          show-author
          :bookmarked-ids="bookmarkedIdSet"
          :starred-ids="starredIdSet"
          :current-user-id="userId"
          empty-message="Aucun deck enregistré. Bookmarke un deck public pour le retrouver ici."
          @update:page-index="bookmarkedPage = $event"
          @toggle-bookmark="onToggleBookmark"
          @toggle-star="onToggleStar"
        />
      </template>
    </TabsContent>
  </Tabs>
</template>
