<script setup lang="ts">
import { computed, ref } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { BotIcon, PlayIcon, RotateCcwIcon } from '@lucide/vue'
import { useAuthUser } from '@/composables/useAuthUser'
import { deckKeys, fetchDeckWithCards, fetchMyDecks, fetchPublicDecks } from '@/queries/decks'
import { createEmptyDeckListQuery } from '@/types/deck'
import { PRESET_DECKS, dbDeckToEngine, type EngineDeck } from '@/lib/aiDecks'
import type { ConfigPartie } from '@/composables/useBlueRising'
import PageHeader from '@/components/common/PageHeader.vue'
import AIGameBoard from '@/components/game/AIGameBoard.vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import SelectField from '@/components/form/SelectField.vue'

const { session } = useAuthUser()

const { data: deckList } = useQuery({
  queryKey: computed(() => [...deckKeys.all, 'ai-picker', session.value?.user.id ?? 'anon']),
  queryFn: async () => {
    const mine = session.value ? await fetchMyDecks(session.value.user.id, 0, createEmptyDeckListQuery()) : { rows: [] }
    const pub = await fetchPublicDecks(0, createEmptyDeckListQuery())
    const byId = new Map<string, { id: string; name: string }>()
    for (const row of [...mine.rows, ...pub.rows]) byId.set(row.id, { id: row.id, name: row.name })
    return [...byId.values()]
  },
})

// Options : decks de test intégrés + tes decks BDD.
const deckOptions = computed(() => [
  ...PRESET_DECKS.map((d, i) => ({ value: `preset:${i}`, label: d.name })),
  ...(deckList.value ?? []).map((d) => ({ value: `db:${d.id}`, label: `Ton deck — ${d.name}` })),
])

const myChoice = ref('preset:0')
const aiChoice = ref('preset:1')
const difficulty = ref('150')
const whoStarts = ref('me') // 'me' | 'ia'

const difficultyOptions = [
  { value: '50', label: 'Facile (50 sims)' },
  { value: '150', label: 'Normal (150 sims)' },
  { value: '400', label: 'Difficile (400 sims)' },
]
const startsOptions = [
  { value: 'toss', label: 'Toss (au hasard)' },
  { value: 'me', label: 'Toi' },
  { value: 'ia', label: "L'IA" },
]
const tossInfo = ref<string | null>(null)

const partie = ref<ConfigPartie | null>(null)
const error = ref<string | null>(null)
const loading = ref(false)

async function resolveDeck(choice: string): Promise<{ deck: EngineDeck | null; issues: string[] }> {
  if (choice.startsWith('preset:')) {
    const i = Number.parseInt(choice.slice(7), 10)
    return { deck: PRESET_DECKS[i] ?? null, issues: PRESET_DECKS[i] ? [] : ['Preset introuvable.'] }
  }
  const id = choice.slice(3)
  const { deck, entries } = await fetchDeckWithCards(id)
  return dbDeckToEngine(deck.name, entries)
}

async function onStart() {
  error.value = null
  loading.value = true
  try {
    const mine = await resolveDeck(myChoice.value)
    const ai = await resolveDeck(aiChoice.value)
    if (!mine.deck) {
      error.value = `Ton deck n'est pas jouable par le moteur : ${mine.issues.join(' ')}`
      return
    }
    if (!ai.deck) {
      error.value = `Le deck de l'IA n'est pas jouable : ${ai.issues.join(' ')}`
      return
    }
    // Qui commence : toss aléatoire, ou choix explicite.
    const startsMe = whoStarts.value === 'toss' ? Math.random() < 0.5 : whoStarts.value === 'me'
    tossInfo.value =
      whoStarts.value === 'toss' ? (startsMe ? '🎲 Toss : tu commences !' : "🎲 Toss : l'IA commence.") : null
    // Le joueur 0 est celui qui commence ; l'IA occupe l'autre siège.
    const joueurIA: 0 | 1 = startsMe ? 1 : 0
    const moi: 0 | 1 = (1 - joueurIA) as 0 | 1
    const deckFor = (seat: 0 | 1): EngineDeck => (seat === moi ? mine.deck! : ai.deck!)
    const d0 = deckFor(0)
    const d1 = deckFor(1)
    partie.value = {
      seed: (Date.now() >>> 0) ^ (Math.floor(Math.random() * 0xffffffff) >>> 0),
      decks: { deck0: d0.deck, env0: d0.env, art0: d0.art, deck1: d1.deck, env1: d1.env, art1: d1.art },
      joueurIA,
      sims: Number.parseInt(difficulty.value, 10),
    }
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    loading.value = false
  }
}

function newGame() {
  partie.value = null
  tossInfo.value = null
}
</script>

<template>
  <PageHeader title="Admin · Partie vs IA">
    <Button v-if="partie" variant="outline" @click="newGame">
      <RotateCcwIcon />
      Nouvelle partie
    </Button>
  </PageHeader>

  <p class="mb-6 max-w-3xl text-sm text-muted-foreground">
    Joue contre l'IA MCTS (moteur Blue Rising complet, dans un Web Worker). Le moteur connaît les 120 cartes du set BR1
    et applique toutes les règles — seules les actions légales sont cliquables. Réservé à l'admin.
  </p>

  <template v-if="!partie">
    <Card class="max-w-2xl">
      <CardContent class="flex flex-col gap-4 py-4">
        <div class="grid gap-4 sm:grid-cols-2">
          <div class="flex flex-col gap-1">
            <span class="text-xs font-medium text-muted-foreground uppercase">Ton deck</span>
            <SelectField v-model="myChoice" :options="deckOptions" />
          </div>
          <div class="flex flex-col gap-1">
            <span class="text-xs font-medium text-muted-foreground uppercase">Deck de l'IA</span>
            <SelectField v-model="aiChoice" :options="deckOptions" />
          </div>
          <div class="flex flex-col gap-1">
            <span class="text-xs font-medium text-muted-foreground uppercase">Difficulté</span>
            <SelectField v-model="difficulty" :options="difficultyOptions" />
          </div>
          <div class="flex flex-col gap-1">
            <span class="text-xs font-medium text-muted-foreground uppercase">Qui commence</span>
            <SelectField v-model="whoStarts" :options="startsOptions" />
          </div>
        </div>

        <p class="text-xs text-muted-foreground">
          Astuce : tes decks BDD ne sont jouables que s'ils n'utilisent que des cartes du set BR1 (n° 1→120) et
          contiennent 1 Environnement, 1 Artefact et ≥ 4 Aspirants reconnus par le moteur.
        </p>

        <p v-if="error" class="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{{ error }}</p>

        <div>
          <Button size="lg" :disabled="loading" @click="onStart">
            <BotIcon v-if="!loading" />
            <PlayIcon v-else />
            {{ loading ? 'Préparation…' : 'Lancer la partie' }}
          </Button>
        </div>
      </CardContent>
    </Card>
  </template>

  <template v-else>
    <div
      v-if="tossInfo"
      class="mb-4 rounded-xl border border-primary/40 bg-primary/5 px-4 py-2 text-center text-sm font-semibold text-primary"
    >
      {{ tossInfo }}
    </div>
    <AIGameBoard :key="partie.seed" :config="partie" />
  </template>
</template>
