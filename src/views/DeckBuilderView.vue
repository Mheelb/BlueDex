<script setup lang="ts">
import { computed, ref } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { toast } from 'vue-sonner'
import { PlusIcon } from '@lucide/vue'
import { useAuthUser } from '@/composables/useAuthUser'
import type { DeckListQuery } from '@/types/deck'
import { createEmptyDeckListQuery } from '@/types/deck'
import {
  DECK_LIST_PAGE_SIZE,
  addBookmark,
  deckKeys,
  fetchBookmarkedDeckIds,
  fetchBookmarkedDecks,
  fetchMyDecks,
  fetchPublicDecks,
  removeBookmark,
} from '@/queries/decks'
import Heading from '@/components/Heading.vue'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import DeckTable from '@/components/deckbuilder/DeckTable.vue'
import DeckListControls from '@/components/deckbuilder/DeckListControls.vue'

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

const { data: publicData, isPending: publicLoading, error: publicError } = useQuery({
  queryKey: computed(() => deckKeys.publicList(publicPage.value, publicFilters.value)),
  queryFn: () => fetchPublicDecks(publicPage.value, publicFilters.value),
})

const { data: myData, isPending: myLoading, error: myError } = useQuery({
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

const { data: bookmarkedData, isPending: bookmarkedLoading, error: bookmarkedError } = useQuery({
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
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: deckKeys.all })
  },
  onError: (err) => {
    toast.error(err.message)
  },
})

function onToggleBookmark(deckId: string) {
  bookmarkMutation.mutate(deckId)
}
</script>

<template>
  <div
    class="relative mb-8 overflow-hidden rounded-3xl bg-gradient-to-br from-[#0b1330] via-[#111d4a] to-[#0a1128] px-6 py-10 sm:px-12 sm:py-12"
  >
    <div
      class="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,rgba(80,130,255,0.3),transparent_60%)]"
      aria-hidden="true"
    />

    <div class="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p class="text-xs font-semibold tracking-[0.2em] text-blue-400 uppercase">Deck Builder</p>
        <Heading size="3xl" class="mt-3 text-white">Construis ton deck</Heading>
        <p class="mt-3 max-w-lg text-zinc-400">
          Assemble tes cartes, respecte les règles du format et partage tes decks avec la communauté Blue Rising.
        </p>
      </div>

      <Button as-child size="lg" class="shrink-0 bg-blue-600 text-white hover:bg-blue-500">
        <RouterLink :to="{ name: 'deck-builder-new' }">
          <PlusIcon />
          Créer un deck
        </RouterLink>
      </Button>
    </div>
  </div>

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
        :current-user-id="userId"
        empty-message="Aucun deck public pour le moment."
        @update:page-index="publicPage = $event"
        @toggle-bookmark="onToggleBookmark"
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
          :current-user-id="userId"
          empty-message="Tu n'as pas encore de deck. Crée-en un !"
          @update:page-index="myPage = $event"
          @toggle-bookmark="onToggleBookmark"
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
          :current-user-id="userId"
          empty-message="Aucun deck enregistré. Bookmarke un deck public pour le retrouver ici."
          @update:page-index="bookmarkedPage = $event"
          @toggle-bookmark="onToggleBookmark"
        />
      </template>
    </TabsContent>
  </Tabs>
</template>
