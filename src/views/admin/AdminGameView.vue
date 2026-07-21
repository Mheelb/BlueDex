<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import {
  DownloadIcon,
  FlagIcon,
  PlayIcon,
  RotateCcwIcon,
  SwordsIcon,
  Trash2Icon,
  UndoIcon,
  UnlockIcon,
  ZapIcon,
  ChevronRightIcon,
  SparklesIcon,
} from '@lucide/vue'
import { useAuthUser } from '@/composables/useAuthUser'
import { useGame } from '@/composables/useGame'
import { deckKeys, fetchDeckWithCards, fetchMyDecks, fetchPublicDecks } from '@/queries/decks'
import {
  createEmptyDeckListQuery,
  DECK_FORMATS,
  DECK_FORMAT_LABELS,
  type DeckEntry,
  type DeckFormat,
} from '@/types/deck'
import { GAME_CONFIGS, PHASES, PHASE_LABELS } from '@/types/game'
import { distinctAspirants, validateDeckForGame } from '@/lib/game'
import PageHeader from '@/components/common/PageHeader.vue'
import PlayerBoard from '@/components/game/PlayerBoard.vue'
import CombatPanel from '@/components/game/CombatPanel.vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import SelectField from '@/components/form/SelectField.vue'
import ConfirmDeleteDialog from '@/components/common/ConfirmDeleteDialog.vue'

const { session } = useAuthUser()
const {
  state,
  selected,
  getCardAt,
  startGame,
  performToss,
  reset,
  freeMode,
  advancePhase,
  advanceLabel,
  toggleTap,
  toggleFaceDown,
  addTempPower,
  discardForResource,
  moveSelectedTo,
  select,
  playCard,
  canPlayHandCard,
  attackable,
  declareAttack,
  combat,
  canSupport,
  assignSupport,
  hasActivatedAbility,
  activateAbility,
  isRevealableArtefact,
  revealArtefact,
  pendingEffect,
  cancelPendingEffect,
  pendingSwap,
  cancelSwap,
} = useGame()

const game = computed(() => state.value)

// --- Liste des decks disponibles -------------------------------------------

const { data: deckList } = useQuery({
  queryKey: computed(() => [...deckKeys.all, 'game-picker', session.value?.user.id ?? 'anon']),
  queryFn: async () => {
    const mine = session.value ? await fetchMyDecks(session.value.user.id, 0, createEmptyDeckListQuery()) : { rows: [] }
    const pub = await fetchPublicDecks(0, createEmptyDeckListQuery())
    const byId = new Map<string, { id: string; name: string; format: DeckFormat }>()
    for (const row of [...mine.rows, ...pub.rows]) byId.set(row.id, { id: row.id, name: row.name, format: row.format })
    return [...byId.values()]
  },
})

const format = ref<DeckFormat>('normal')
const gameConfig = computed(() => GAME_CONFIGS[format.value])

const formatOptions = DECK_FORMATS.map((f) => ({ value: f, label: DECK_FORMAT_LABELS[f] }))
const deckOptions = computed(() =>
  (deckList.value ?? []).filter((d) => d.format === format.value).map((d) => ({ value: d.id, label: d.name })),
)

interface SideSetup {
  deckId: string
  deckName: string
  entries: DeckEntry[] | null
  loading: boolean
  chosen: string[]
}

function emptySide(): SideSetup {
  return { deckId: '', deckName: '', entries: null, loading: false, chosen: [] }
}

const sides = reactive<{ a: SideSetup; b: SideSetup }>({ a: emptySide(), b: emptySide() })

async function loadSide(key: 'a' | 'b', deckId: string) {
  const side = sides[key]
  side.deckId = deckId
  side.entries = null
  side.chosen = []
  if (!deckId) return
  side.loading = true
  try {
    const { deck, entries } = await fetchDeckWithCards(deckId)
    side.deckName = deck.name
    side.entries = entries
    // Pré-sélection des premiers Aspirants distincts.
    side.chosen = distinctAspirants(entries)
      .slice(0, GAME_CONFIGS[format.value].aspirantsInPlay)
      .map((c) => c.id)
  } finally {
    side.loading = false
  }
}

watch(format, () => {
  // Un changement de format peut invalider le nombre d'Aspirants pré-choisis.
  for (const key of ['a', 'b'] as const) {
    if (sides[key].entries) loadSide(key, sides[key].deckId)
  }
})

function aspirantsFor(side: SideSetup) {
  return side.entries ? distinctAspirants(side.entries) : []
}

function toggleAspirant(side: SideSetup, cardId: string) {
  const limit = gameConfig.value.aspirantsInPlay
  const idx = side.chosen.indexOf(cardId)
  if (idx >= 0) side.chosen.splice(idx, 1)
  else if (side.chosen.length < limit) side.chosen.push(cardId)
}

function sideIssues(side: SideSetup): string[] {
  if (!side.entries) return ['Choisis un deck.']
  const issues = validateDeckForGame(side.entries, gameConfig.value).messages
  if (side.chosen.length !== gameConfig.value.aspirantsInPlay)
    issues.push(`Sélectionne ${gameConfig.value.aspirantsInPlay} Aspirants (actuellement ${side.chosen.length}).`)
  return issues
}

const canStart = computed(
  () =>
    sides.a.entries !== null &&
    sides.b.entries !== null &&
    sideIssues(sides.a).length === 0 &&
    sideIssues(sides.b).length === 0,
)

function onStart() {
  if (!canStart.value || !sides.a.entries || !sides.b.entries) return
  tossResult.value = null
  tossing.value = false
  startGame(
    format.value,
    { name: 'Joueur A', deckName: sides.a.deckName, entries: sides.a.entries, chosenAspirantIds: sides.a.chosen },
    { name: 'Joueur B', deckName: sides.b.deckName, entries: sides.b.entries, chosenAspirantIds: sides.b.chosen },
  )
}

// --- Toss pour désigner le premier joueur -----------------------------------

const tossing = ref(false)
const tossResult = ref<'a' | 'b' | null>(null)

function launchToss() {
  if (tossing.value) return
  tossResult.value = null
  tossing.value = true
  window.setTimeout(() => {
    tossResult.value = Math.random() < 0.5 ? 'a' : 'b'
    tossing.value = false
  }, 1500)
}

function enterArena() {
  if (!tossResult.value) return
  performToss(tossResult.value)
}

// --- Carte sélectionnée -----------------------------------------------------

const selectedCard = computed(() => (selected.value ? getCardAt(selected.value) : null))
const selectedInHand = computed(() => selected.value?.zone === 'hand')
const selectedIsEvent = computed(
  () => selectedInHand.value && !freeMode.value && selectedCard.value?.card.type === 'Événement',
)
const canPlaySelectedEvent = computed(() => (selected.value ? canPlayHandCard(selected.value) : false))
const selectedCanAttack = computed(() => !!selected.value && !combat.value && attackable(selected.value))
const selectedCanSupport = computed(() => !!selected.value && !!combat.value && canSupport(selected.value))
const selectedCanActivate = computed(
  () => !!selected.value && selected.value.zone !== 'hand' && hasActivatedAbility(selected.value),
)
const selectedIsArtefact = computed(
  () => !!selected.value && selected.value.zone === 'artefact' && isRevealableArtefact(selected.value),
)

const showLog = ref(true)

// --- Export du journal ------------------------------------------------------

function exportLog() {
  const g = game.value
  if (!g) return
  // Le journal est stocké du plus récent au plus ancien : on le remet à l'endroit.
  const lines = [...g.log].reverse()
  const header = [
    'Blue Rising — Journal de partie',
    `Date : ${new Date().toLocaleString('fr-FR')}`,
    `Format : ${DECK_FORMAT_LABELS[g.config.format]} (${g.config.victoryTarget} PV)`,
    `${g.players.a.name} — ${g.players.a.deckName}`,
    `${g.players.b.name} — ${g.players.b.deckName}`,
    g.winner
      ? `Résultat : ${g.players[g.winner].name} l'emporte (${g.players[g.winner].victoryPoints} PV)`
      : `Statut : partie en cours (tour ${g.turn})`,
    '',
    '--- Déroulé (du début à la fin) ---',
    '',
  ]
  const text = [...header, ...lines].join('\r\n')
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `partie-blue-rising-${new Date().toISOString().slice(0, 10)}.txt`
  link.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <PageHeader title="Admin · Partie test">
    <div v-if="game" class="flex gap-2">
      <ConfirmDeleteDialog
        title="Nouvelle partie ?"
        description="La partie en cours sera perdue."
        confirm-label="Recommencer"
        variant="default"
        @confirm="reset"
      >
        <Button variant="outline">
          <RotateCcwIcon />
          Nouvelle partie
        </Button>
      </ConfirmDeleteDialog>
    </div>
  </PageHeader>

  <p class="mb-6 max-w-3xl text-sm text-muted-foreground">
    Plateau de test des règles Blue Rising, en solo (tu contrôles les deux camps). Le moteur applique la structure
    (zones, phases, ressources, pioche, points de victoire) ; les effets de carte s'appliquent à la main. Réservé à
    l'admin — non accessible publiquement.
  </p>

  <!-- ============================ PRÉPARATION ============================ -->
  <template v-if="!game">
    <Card class="mb-6 max-w-md">
      <CardContent class="flex items-center gap-3 py-4">
        <span class="text-sm font-medium">Format</span>
        <SelectField v-model="format" :options="formatOptions" class="w-48" />
        <span class="text-xs text-muted-foreground">
          {{ gameConfig.victoryTarget }} PV · {{ gameConfig.aspirantsInPlay }} Aspirants
        </span>
      </CardContent>
    </Card>

    <div class="grid gap-4 lg:grid-cols-2">
      <Card v-for="key in ['a', 'b'] as const" :key="key">
        <CardContent class="flex flex-col gap-3 py-4">
          <h3 class="font-engraved text-sm font-bold tracking-wide">Camp {{ key === 'a' ? 'A' : 'B' }}</h3>

          <SelectField
            :model-value="sides[key].deckId"
            :options="deckOptions"
            placeholder="Choisir un deck…"
            @update:model-value="(v) => loadSide(key, String(v))"
          />

          <p v-if="sides[key].loading" class="text-xs text-muted-foreground">Chargement du deck…</p>

          <template v-if="sides[key].entries">
            <div>
              <p class="mb-1 text-[11px] font-medium text-muted-foreground uppercase">
                Aspirants de départ ({{ sides[key].chosen.length }}/{{ gameConfig.aspirantsInPlay }})
              </p>
              <div class="flex flex-wrap gap-1.5">
                <button
                  v-for="asp in aspirantsFor(sides[key])"
                  :key="asp.id"
                  type="button"
                  class="rounded-full border px-2.5 py-1 text-xs transition-colors"
                  :class="
                    sides[key].chosen.includes(asp.id)
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border hover:bg-muted'
                  "
                  @click="toggleAspirant(sides[key], asp.id)"
                >
                  {{ asp.name }}
                </button>
              </div>
            </div>

            <ul v-if="sideIssues(sides[key]).length" class="flex flex-col gap-0.5">
              <li v-for="issue in sideIssues(sides[key])" :key="issue" class="text-xs text-destructive">
                {{ issue }}
              </li>
            </ul>
            <p v-else class="text-xs text-emerald-500">Deck prêt ✓</p>
          </template>
        </CardContent>
      </Card>
    </div>

    <div class="mt-6">
      <Button size="lg" :disabled="!canStart" @click="onStart">
        <PlayIcon />
        Lancer la partie
      </Button>
    </div>
  </template>

  <!-- =============================== TOSS =============================== -->
  <template v-else-if="game.status === 'toss'">
    <div class="mx-auto flex max-w-md flex-col items-center gap-6 py-10 text-center">
      <p class="text-sm text-muted-foreground">Un toss désigne aléatoirement le joueur qui commence.</p>

      <div class="coin" :class="{ 'coin--spinning': tossing }">
        <span class="coin__face">BR</span>
      </div>

      <template v-if="tossResult && !tossing">
        <p class="text-lg font-bold">
          {{ game.players[tossResult].name }} commence !
          <span class="block text-sm font-normal text-muted-foreground">
            Il pioche {{ game.config.startingHand.first }} cartes, l'adversaire {{ game.config.startingHand.second }}.
          </span>
        </p>
        <div class="flex gap-2">
          <Button variant="outline" @click="launchToss">
            <RotateCcwIcon />
            Relancer
          </Button>
          <Button size="lg" @click="enterArena">
            <PlayIcon />
            Entrer dans l'arène
          </Button>
        </div>
      </template>
      <Button v-else-if="!tossing" size="lg" @click="launchToss">
        <SwordsIcon />
        Lancer le toss
      </Button>
      <p v-else class="text-sm font-medium text-primary">La pièce tourne…</p>
    </div>
  </template>

  <!-- ============================== PARTIE =============================== -->
  <template v-else>
    <!-- Barre de tour -->
    <div class="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-primary/40 bg-primary/5 px-4 py-2">
      <span class="font-engraved text-sm font-bold">Tour {{ game.turn }}</span>
      <span class="text-sm text-muted-foreground">·</span>
      <span class="text-sm font-medium">{{ game.players[game.activePlayer].name }}</span>

      <!-- Progression des phases -->
      <div class="flex items-center gap-1">
        <span
          v-for="ph in PHASES"
          :key="ph"
          class="rounded-full px-2 py-0.5 text-[11px] font-semibold transition-colors"
          :class="game.phase === ph ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'"
        >
          {{ PHASE_LABELS[ph] }}
        </span>
      </div>

      <div class="ml-auto flex items-center gap-2">
        <Button
          :variant="freeMode ? 'default' : 'outline'"
          size="sm"
          :title="'Débloque les deux camps pour les réactions (piège, soutien, contre-attaque) et la résolution de combat.'"
          @click="freeMode = !freeMode"
        >
          <UnlockIcon />
          Mode libre{{ freeMode ? ' : ON' : '' }}
        </Button>
        <Button size="sm" :disabled="!!game.winner" @click="advancePhase">
          <FlagIcon v-if="game.phase === 'fin'" />
          <ChevronRightIcon v-else />
          {{ advanceLabel }}
        </Button>
      </div>
    </div>

    <p
      v-if="freeMode"
      class="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-600"
    >
      Mode libre actif — les deux camps sont manipulables (réactions / résolution de combat). Pense à le désactiver pour
      revenir au tour par tour.
    </p>

    <div
      v-if="game.winner"
      class="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-emerald-500/50 bg-emerald-500/10 px-4 py-3 text-emerald-500"
    >
      <SparklesIcon />
      <span class="font-bold">{{ game.players[game.winner].name }} remporte la partie !</span>
      <Button variant="outline" size="sm" class="ml-auto" @click="exportLog">
        <DownloadIcon />
        Exporter le journal
      </Button>
    </div>

    <!-- Barre d'action sur la sélection -->
    <div
      v-if="selectedCard"
      class="sticky top-2 z-10 mb-4 flex flex-wrap items-center gap-2 rounded-xl border bg-card/95 px-3 py-2 shadow-sm backdrop-blur"
    >
      <span class="text-xs font-medium">
        {{ selectedCard.faceDown ? 'Carte face cachée' : selectedCard.card.name }}
      </span>
      <span class="mr-1 h-4 w-px bg-border" />
      <Button variant="outline" size="sm" @click="toggleTap">
        <RotateCcwIcon />
        {{ selectedCard.tapped ? 'Redresser' : 'Incliner' }}
      </Button>
      <Button variant="outline" size="sm" @click="toggleFaceDown">
        {{ selectedCard.faceDown ? 'Révéler' : 'Retourner' }}
      </Button>
      <div class="flex items-center gap-1">
        <Button variant="outline" size="sm" @click="addTempPower(-1)">−1</Button>
        <span class="text-[11px] text-muted-foreground">Puiss.</span>
        <Button variant="outline" size="sm" @click="addTempPower(1)">+1</Button>
      </div>
      <span class="mx-1 h-4 w-px bg-border" />
      <Button v-if="selectedCanAttack" size="sm" @click="selected && declareAttack(selected)">
        <SwordsIcon />
        Déclarer l'attaque
      </Button>
      <Button v-if="selectedCanSupport" size="sm" variant="outline" @click="selected && assignSupport(selected)">
        Ajouter en soutien
      </Button>
      <Button v-if="selectedCanActivate" size="sm" @click="selected && activateAbility(selected)">
        <ZapIcon />
        Activer l'effet
      </Button>
      <Button v-if="selectedIsArtefact" size="sm" @click="selected && revealArtefact(selected.player)">
        <SparklesIcon />
        Révéler l'Artefact
      </Button>
      <Button
        v-if="selectedIsEvent"
        size="sm"
        :disabled="!canPlaySelectedEvent"
        @click="selected && playCard(selected)"
      >
        Jouer l'événement
      </Button>
      <Button v-if="selectedInHand" variant="outline" size="sm" @click="discardForResource">
        Défausser (+1 ress.)
      </Button>
      <Button variant="outline" size="sm" @click="moveSelectedTo('hand')">
        <UndoIcon />
        En main
      </Button>
      <Button variant="outline" size="sm" class="text-destructive" @click="moveSelectedTo('discard')">
        <Trash2Icon />
        Défausser
      </Button>
      <Button variant="ghost" size="sm" @click="moveSelectedTo('draw')">Sur le deck</Button>
      <Button variant="ghost" size="sm" class="ml-auto" @click="select(null)">Désélectionner</Button>

      <p
        v-if="selectedCard.card.effect && (!selectedCard.faceDown || selectedIsArtefact)"
        class="w-full border-t border-border/50 pt-1.5 text-[11px] leading-snug text-muted-foreground"
      >
        💬 {{ selectedCard.card.effect }}
      </p>
    </div>

    <!-- Ciblage d'un effet (buff de puissance) -->
    <div
      v-if="pendingEffect"
      class="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-emerald-500/50 bg-emerald-500/10 px-4 py-2 text-sm"
    >
      <ZapIcon class="size-4 text-emerald-500" />
      <span>
        <span class="font-semibold">{{ pendingEffect.card.card.name }}</span> —
        {{
          pendingEffect.kind === 'untap'
            ? 'clique le personnage à redresser'
            : pendingEffect.kind === 'return'
              ? 'clique le personnage à renvoyer en main'
              : pendingEffect.kind === 'destroy'
                ? pendingEffect.targetType === 'piege'
                  ? 'clique le piège à détruire'
                  : 'clique le personnage à détruire'
                : 'clique le personnage à booster'
        }}
        (surligné en vert).
      </span>
      <Button variant="ghost" size="sm" class="ml-auto" @click="cancelPendingEffect">Annuler</Button>
    </div>

    <!-- Ciblage d'un échange d'emplacement -->
    <div
      v-if="pendingSwap"
      class="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-emerald-500/50 bg-emerald-500/10 px-4 py-2 text-sm"
    >
      <ZapIcon class="size-4 text-emerald-500" />
      <span>Échange d'emplacement — clique l'allié (surligné en vert) avec qui échanger.</span>
      <Button variant="ghost" size="sm" class="ml-auto" @click="cancelSwap">Annuler</Button>
    </div>

    <!-- Combat guidé (visible pendant une attaque) -->
    <div class="mb-4">
      <CombatPanel />
    </div>

    <!-- Plateaux : les deux camps côte à côte -->
    <div class="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
      <PlayerBoard player-id="a" />
      <PlayerBoard player-id="b" />
    </div>

    <!-- Journal -->
    <div class="mt-6">
      <Card>
        <CardContent class="flex flex-col gap-2 py-4">
          <div class="flex items-center justify-between gap-2">
            <button class="flex flex-1 items-center gap-1 text-sm font-bold" type="button" @click="showLog = !showLog">
              Journal de partie ({{ game.log.length }})
              <ChevronRightIcon class="size-4 transition-transform" :class="showLog ? 'rotate-90' : ''" />
            </button>
            <Button variant="outline" size="sm" :disabled="game.log.length === 0" @click="exportLog">
              <DownloadIcon />
              Exporter
            </Button>
          </div>
          <ul v-if="showLog" class="flex max-h-64 flex-col gap-0.5 overflow-y-auto text-xs text-muted-foreground">
            <li v-for="(entry, i) in game.log" :key="i" class="border-b border-border/40 py-1 last:border-0">
              {{ entry }}
            </li>
            <li v-if="game.log.length === 0" class="py-1">Aucune action pour le moment.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  </template>
</template>

<style scoped>
.coin {
  width: 96px;
  height: 96px;
  border-radius: 9999px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle at 35% 30%, var(--color-gold-bright, #e5c76b), var(--color-primary, #c2aa69));
  box-shadow:
    inset 0 0 0 4px rgba(255, 255, 255, 0.25),
    0 8px 20px rgba(0, 0, 0, 0.35);
  transform-style: preserve-3d;
}

.coin__face {
  font-family: var(--font-engraved, serif);
  font-weight: 700;
  font-size: 1.75rem;
  color: #1a1200;
  letter-spacing: 0.04em;
}

.coin--spinning {
  animation: coin-flip 0.35s linear infinite;
}

@keyframes coin-flip {
  0% {
    transform: rotateX(0deg);
  }
  100% {
    transform: rotateX(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .coin--spinning {
    animation-duration: 1.2s;
  }
}
</style>
