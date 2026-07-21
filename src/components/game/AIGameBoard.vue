<script setup lang="ts">
import { computed } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { LoaderIcon, SwordsIcon, RotateCcwIcon, Trophy } from '@lucide/vue'
import { useBlueRising, type ConfigPartie } from '@/composables/useBlueRising'
import { PASS, HAND, DISC, SLOT, ESLOT, COL, INCL, TAP_ENV, ARTEFACT, ATT, TRAP } from '@/game-ai/blueRising'
import { carteInfo } from '@/lib/aiDecks'
import { fetchCardImages, normalizeName } from '@/lib/aiCardImages'
import { cdnImage } from '@/lib/imageCdn'
import { Button } from '@/components/ui/button'

const props = defineProps<{ config: ConfigPartie }>()

const { etat, legales, enReflexion, journal, puissances, jouerHumain, joueurIA } = useBlueRising(props.config)

const moi = (1 - joueurIA) as 0 | 1
const adv = joueurIA

/** Puissance effective (buffs/split/auras) d'un emplacement, sinon la puissance de base. */
function puiss(j: 0 | 1, s: number, id: number): number {
  return puissances.value[j]?.[s] ?? (id < 0 ? 1 : (carteInfo(id)?.puissance ?? 0))
}

const legalesSet = computed(() => new Set(legales.value))
const can = (a: number) => legalesSet.value.has(a)

const me = computed(() => etat.value.joueurs[moi])
const them = computed(() => etat.value.joueurs[adv])

const PHASE_LABELS: Record<string, string> = {
  placement: 'Place tes Aspirants',
  mulligan: 'Mulligan (remplace des cartes)',
  main: 'Ta phase principale',
  slot: 'Choisis un emplacement',
  colonne: 'Choisis une colonne à attaquer',
  cible: 'Choisis une cible',
  bloc: 'Bloquer ? (déplacer un défenseur)',
  piege: 'Activer le piège ?',
  soutienAtt: "Soutien de l'attaquant ?",
  soutienDef: 'Soutien du défenseur ?',
  triomphe: 'Triomphe : payer le coût ?',
  defausseFin: 'Défausse (trop de cartes en main)',
  over: 'Partie terminée',
}

const monTour = computed(() => etat.value.actif === moi)
const phaseLabel = computed(() => PHASE_LABELS[etat.value.phase] ?? etat.value.phase)
const isPlacement = computed(() => etat.value.phase === 'placement')
const isMulligan = computed(() => etat.value.phase === 'mulligan')
const passLabel = computed(() => {
  if (etat.value.phase === 'main') return 'Fin de tour'
  if (etat.value.phase === 'mulligan') return me.value.mulliganAside.length ? 'Repiocher & continuer' : 'Garder ma main'
  return 'Passer'
})

const winner = computed<null | 0 | 1>(() => {
  if (!etat.value.finie) return null
  return etat.value.recompense > 0 ? 0 : 1
})

const SLOT_ORDER_AVANT = [0, 1, 2]
const SLOT_ORDER_ARRIERE = [3, 4, 5]

function nom(id: number): string {
  if (id < 0) return 'Écuyer'
  return carteInfo(id)?.nom ?? `#${id}`
}
function info(id: number) {
  return id < 0 ? { cout: 0, puissance: 1, soutien: 0, type: 'personnage', faction: null } : carteInfo(id)
}

// Art des cartes : rapproché de la BDD par nom.
const { data: imgMap } = useQuery({ queryKey: ['ai-card-images'], queryFn: fetchCardImages, staleTime: Infinity })
function imgFor(id: number): string | undefined {
  if (id < 0) return undefined
  const n = carteInfo(id)?.nom
  const url = n && imgMap.value ? imgMap.value[normalizeName(n)] : undefined
  return url ? cdnImage(url, 220) : undefined
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <!-- Barre d'état -->
    <div class="flex flex-wrap items-center gap-3 rounded-xl border border-primary/40 bg-primary/5 px-4 py-2">
      <span class="font-engraved text-sm font-bold">Tour {{ etat.tour }}</span>
      <span
        class="rounded-full px-2 py-0.5 text-[11px] font-semibold"
        :class="monTour ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'"
      >
        {{ monTour ? 'À toi' : "Tour de l'IA" }}
      </span>
      <span class="text-sm text-muted-foreground">{{ phaseLabel }}</span>
      <span v-if="enReflexion" class="flex items-center gap-1 text-sm text-primary">
        <LoaderIcon class="size-4 animate-spin" />
        L'IA réfléchit…
      </span>
      <div class="ml-auto flex items-center gap-2">
        <Button v-if="can(PASS)" size="sm" @click="jouerHumain(PASS)">{{ passLabel }}</Button>
        <Button v-if="can(TRAP)" size="sm" variant="outline" @click="jouerHumain(TRAP)">Activer le piège</Button>
      </div>
    </div>

    <div
      v-if="winner !== null"
      class="rounded-xl border border-emerald-500/50 bg-emerald-500/10 px-4 py-3 text-center font-bold text-emerald-500"
    >
      {{ winner === moi ? '🏆 Tu remportes la partie !' : "L'IA remporte la partie." }}
    </div>

    <!-- Setup : placement des Aspirants / mulligan -->
    <div
      v-if="monTour && (isPlacement || isMulligan)"
      class="rounded-xl border border-primary/50 bg-primary/10 px-4 py-2 text-sm"
    >
      <template v-if="isPlacement">
        <span class="font-semibold">Place tes Aspirants</span> — clique un emplacement (surligné en vert) pour poser
        <span class="font-medium text-primary">{{ nom(me.aPlacer[0]) }}</span> · {{ me.aPlacer.length }} restant(s).
      </template>
      <template v-else>
        <span class="font-semibold">Mulligan</span> — clique les cartes de ta main à remplacer, puis «
        {{ passLabel }} ». {{ me.mulliganAside.length }} carte(s) mise(s) de côté.
      </template>
    </div>

    <!-- ===================== CAMP ADVERSE (IA) ===================== -->
    <div class="rounded-xl border border-border bg-card p-3">
      <div class="mb-2 flex items-center gap-3 text-sm">
        <span class="font-bold">IA</span>
        <span class="flex items-center gap-1"><Trophy class="size-4 text-primary" />{{ them.pv }}/5</span>
        <span class="text-muted-foreground">Main {{ them.main.length }} · Deck {{ them.deck.length }}</span>
        <span class="ml-auto text-xs text-muted-foreground">Env : {{ nom(them.env) }} · PV env atteint = 1 pt</span>
      </div>

      <!-- Colonnes cliquables (attaque) -->
      <div class="mb-1 grid grid-cols-3 gap-2">
        <button
          v-for="c in [0, 1, 2]"
          :key="`col-${c}`"
          type="button"
          class="rounded-md border border-dashed py-0.5 text-[11px] transition-colors"
          :class="
            can(COL(c))
              ? 'cursor-pointer border-rose-500/70 bg-rose-500/10 text-rose-500'
              : 'border-transparent text-muted-foreground'
          "
          :disabled="!can(COL(c))"
          @click="jouerHumain(COL(c))"
        >
          Colonne {{ ['A', 'B', 'C'][c] }}
        </button>
      </div>

      <!-- Plateau adverse : Avant (proche) puis Arrière -->
      <div
        v-for="(ligne, li) in [SLOT_ORDER_AVANT, SLOT_ORDER_ARRIERE]"
        :key="`adv-l-${li}`"
        class="mb-1 grid grid-cols-3 gap-2"
      >
        <div
          v-for="s in ligne"
          :key="`adv-${s}`"
          class="flex min-h-[3rem] flex-col justify-center rounded-md border p-1 text-[11px]"
          :class="[
            them.plateau[s] ? 'border-border bg-muted/40' : 'border-dashed border-border/50',
            can(ESLOT(s)) ? 'cursor-pointer ring-2 ring-rose-500/70' : '',
          ]"
          @click="can(ESLOT(s)) && jouerHumain(ESLOT(s))"
        >
          <template v-if="them.plateau[s]">
            <div class="relative mx-auto w-24" :class="them.plateau[s]!.incline ? 'opacity-60' : ''">
              <img
                v-if="imgFor(them.plateau[s]!.carte)"
                :src="imgFor(them.plateau[s]!.carte)"
                :alt="nom(them.plateau[s]!.carte)"
                class="aspect-[5/7] w-full rounded object-cover"
              />
              <span
                class="absolute right-0.5 bottom-0.5 rounded bg-black/75 px-1 text-[10px] font-bold text-emerald-300"
              >
                P{{ puiss(adv, s, them.plateau[s]!.carte) }}
              </span>
              <img
                v-if="them.plateau[s]!.objet !== null && imgFor(them.plateau[s]!.objet!)"
                :src="imgFor(them.plateau[s]!.objet!)"
                :title="`Objet : ${nom(them.plateau[s]!.objet!)}`"
                class="absolute bottom-0.5 left-0.5 size-5 rounded border border-violet-400 object-cover shadow"
              />
              <span
                v-else-if="them.plateau[s]!.objet !== null"
                :title="`Objet : ${nom(them.plateau[s]!.objet!)}`"
                class="absolute bottom-0.5 left-0.5 rounded bg-violet-600 px-1 text-[9px] font-bold text-white"
              >
                Obj
              </span>
            </div>
            <span class="mt-0.5 truncate text-center text-[10px]">
              {{ nom(them.plateau[s]!.carte) }}<span v-if="them.plateau[s]!.incline"> ·incl</span>
            </span>
            <span v-if="them.plateau[s]!.objet !== null" class="truncate text-center text-[9px] text-violet-400">
              🔧 {{ nom(them.plateau[s]!.objet!) }}
            </span>
          </template>
          <span v-else class="text-center text-muted-foreground/40">·</span>
        </div>
      </div>

      <!-- Pièges adverses (face cachée) -->
      <div class="mt-1 flex gap-2 text-[10px] text-muted-foreground">
        <span
          v-for="c in [0, 1, 2]"
          :key="`advp-${c}`"
          class="flex-1 rounded border border-dashed border-rose-500/20 py-0.5 text-center"
        >
          {{ them.pieges[c] !== null ? '🂠 Piège' : '—' }}
        </span>
      </div>
    </div>

    <!-- ========================= MON CAMP ========================= -->
    <div class="rounded-xl border p-3" :class="monTour ? 'border-primary/60 bg-primary/5' : 'border-border bg-card'">
      <div class="mb-2 flex flex-wrap items-center gap-3 text-sm">
        <span class="font-bold">Toi</span>
        <span class="flex items-center gap-1"><Trophy class="size-4 text-primary" />{{ me.pv }}/5</span>
        <span class="rounded bg-muted px-2 py-0.5 text-xs">
          Ressources : {{ me.resGen }}<span v-if="me.resFac"> (+{{ me.resFac }} faction)</span>
        </span>
        <span class="text-muted-foreground">Deck {{ me.deck.length }} · Défausse {{ me.defausse.length }}</span>
        <!-- Environnement / Artefact -->
        <button
          type="button"
          class="rounded border px-2 py-0.5 text-xs"
          :class="
            can(TAP_ENV) ? 'cursor-pointer border-teal-500/70 bg-teal-500/10' : 'border-border text-muted-foreground'
          "
          :disabled="!can(TAP_ENV)"
          @click="jouerHumain(TAP_ENV)"
        >
          Env : {{ nom(me.env) }}{{ me.envIncline ? ' (incliné)' : '' }}
        </button>
        <button
          type="button"
          class="rounded border px-2 py-0.5 text-xs"
          :class="
            can(ARTEFACT) ? 'cursor-pointer border-amber-500/70 bg-amber-500/10' : 'border-border text-muted-foreground'
          "
          :disabled="!can(ARTEFACT)"
          @click="jouerHumain(ARTEFACT)"
        >
          Artefact {{ me.artefactUtilise ? '(utilisé)' : can(ARTEFACT) ? '(quête OK !)' : '' }}
        </button>
      </div>

      <!-- Mon plateau : Avant puis Arrière -->
      <div
        v-for="(ligne, li) in [SLOT_ORDER_AVANT, SLOT_ORDER_ARRIERE]"
        :key="`me-l-${li}`"
        class="mb-1 grid grid-cols-3 gap-2"
      >
        <div
          v-for="s in ligne"
          :key="`me-${s}`"
          class="flex min-h-[3rem] flex-col justify-between rounded-md border p-1 text-[11px]"
          :class="[
            me.plateau[s] ? 'border-border bg-muted/40' : 'border-dashed border-border/50',
            can(SLOT(s)) ? 'cursor-pointer ring-2 ring-emerald-500/70' : '',
          ]"
          @click="can(SLOT(s)) && jouerHumain(SLOT(s))"
        >
          <template v-if="me.plateau[s]">
            <div class="relative mx-auto w-24" :class="me.plateau[s]!.incline ? 'opacity-60' : ''">
              <img
                v-if="imgFor(me.plateau[s]!.carte)"
                :src="imgFor(me.plateau[s]!.carte)"
                :alt="nom(me.plateau[s]!.carte)"
                class="aspect-[5/7] w-full rounded object-cover"
              />
              <span v-else class="block truncate rounded bg-muted px-1 py-2 text-center font-medium">
                {{ nom(me.plateau[s]!.carte) }}
              </span>
              <span
                class="absolute right-0.5 bottom-0.5 rounded bg-black/75 px-1 text-[10px] font-bold text-emerald-300"
              >
                P{{ puiss(moi, s, me.plateau[s]!.carte) }}
              </span>
              <img
                v-if="me.plateau[s]!.objet !== null && imgFor(me.plateau[s]!.objet!)"
                :src="imgFor(me.plateau[s]!.objet!)"
                :title="`Objet : ${nom(me.plateau[s]!.objet!)}`"
                class="absolute bottom-0.5 left-0.5 size-5 rounded border border-violet-400 object-cover shadow"
              />
              <span
                v-else-if="me.plateau[s]!.objet !== null"
                :title="`Objet : ${nom(me.plateau[s]!.objet!)}`"
                class="absolute bottom-0.5 left-0.5 rounded bg-violet-600 px-1 text-[9px] font-bold text-white"
              >
                Obj
              </span>
            </div>
            <span class="mt-0.5 truncate text-center text-[10px]">{{ nom(me.plateau[s]!.carte) }}</span>
            <span v-if="me.plateau[s]!.objet !== null" class="truncate text-center text-[9px] text-violet-400">
              🔧 {{ nom(me.plateau[s]!.objet!) }}
            </span>
            <div class="mt-0.5 flex flex-wrap gap-1">
              <button
                v-if="can(ATT(s))"
                type="button"
                class="flex items-center gap-0.5 rounded bg-rose-600 px-1 text-[10px] font-bold text-white"
                @click.stop="jouerHumain(ATT(s))"
              >
                <SwordsIcon class="size-2.5" />Att
              </button>
              <button
                v-if="can(INCL(s))"
                type="button"
                class="flex items-center gap-0.5 rounded bg-slate-600 px-1 text-[10px] font-bold text-white"
                @click.stop="jouerHumain(INCL(s))"
              >
                <RotateCcwIcon class="size-2.5" />Incl
              </button>
              <span v-if="me.plateau[s]!.incline" class="text-[9px] text-muted-foreground">incliné</span>
            </div>
          </template>
          <span v-else class="text-center text-muted-foreground/40">emplacement {{ s }}</span>
        </div>
      </div>

      <!-- Mes pièges -->
      <div class="mt-1 flex gap-2 text-[10px] text-muted-foreground">
        <span
          v-for="c in [0, 1, 2]"
          :key="`mep-${c}`"
          class="flex-1 rounded border border-dashed border-rose-500/20 py-0.5 text-center"
        >
          {{ me.pieges[c] !== null ? `Piège: ${nom(me.pieges[c]!)}` : '—' }}
        </span>
      </div>

      <!-- Ma main -->
      <div class="mt-3">
        <p class="mb-1 text-[10px] font-medium text-muted-foreground uppercase">Main ({{ me.main.length }})</p>
        <div class="flex flex-wrap gap-2">
          <div
            v-for="(id, i) in me.main"
            :key="`hand-${i}`"
            class="w-16 rounded-md border p-1 text-[11px]"
            :class="
              (isMulligan ? can(DISC(i)) : can(HAND(i)))
                ? isMulligan
                  ? 'cursor-pointer border-amber-500/70 bg-amber-500/5'
                  : 'cursor-pointer border-emerald-500/70 bg-emerald-500/5'
                : 'border-border'
            "
            @click="isMulligan ? can(DISC(i)) && jouerHumain(DISC(i)) : can(HAND(i)) && jouerHumain(HAND(i))"
          >
            <div class="relative">
              <img
                v-if="imgFor(id)"
                :src="imgFor(id)"
                :alt="nom(id)"
                class="aspect-[5/7] w-full rounded object-cover"
              />
              <span
                v-else
                class="flex aspect-[5/7] items-center justify-center rounded bg-muted p-1 text-center font-medium"
              >
                {{ nom(id) }}
              </span>
              <span
                class="absolute top-0.5 right-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground"
              >
                {{ info(id)?.cout }}
              </span>
            </div>
            <div class="mt-0.5 flex items-center justify-between text-[10px] text-muted-foreground">
              <span class="truncate">{{ nom(id) }}</span>
              <span v-if="info(id)?.type === 'personnage'" class="shrink-0">P{{ info(id)?.puissance }}</span>
            </div>
            <button
              v-if="!isMulligan && can(DISC(i))"
              type="button"
              class="mt-1 w-full rounded bg-slate-600 py-0.5 text-[10px] font-medium text-white"
              @click.stop="jouerHumain(DISC(i))"
            >
              Défausser (+1 ress.)
            </button>
            <span v-else-if="isMulligan" class="mt-1 block text-center text-[9px] text-amber-500">à remplacer ?</span>
          </div>
          <p v-if="me.main.length === 0" class="self-center text-xs text-muted-foreground">Main vide</p>
        </div>
      </div>
    </div>

    <!-- Journal (ce que TOI et l'IA faites) -->
    <div class="rounded-xl border bg-card p-3">
      <p class="mb-2 text-sm font-bold">Journal</p>
      <ul class="flex max-h-64 flex-col gap-0.5 overflow-y-auto text-xs">
        <li
          v-for="(entry, i) in journal"
          :key="i"
          class="flex items-start gap-2 border-b border-border/40 py-1 last:border-0"
        >
          <span
            class="mt-0.5 shrink-0 rounded px-1.5 text-[10px] font-bold"
            :class="entry.ia ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'"
          >
            {{ entry.ia ? 'IA' : 'Toi' }}
          </span>
          <span :class="entry.ia ? 'text-foreground' : 'text-muted-foreground'">{{ entry.texte }}</span>
        </li>
        <li v-if="journal.length === 0" class="py-1 text-muted-foreground">La partie commence…</li>
      </ul>
    </div>
  </div>
</template>
