<script setup lang="ts">
import { computed } from 'vue'
import { ArrowDownToLineIcon, LayersIcon, LockIcon, MinusIcon, PlusIcon, RotateCcwIcon, Trophy } from '@lucide/vue'
import { useGame } from '@/composables/useGame'
import type { CardRef, GameCard, PlayerId, Zone } from '@/types/game'
import { Button } from '@/components/ui/button'
import GameCardToken from '@/components/game/GameCardToken.vue'

const props = defineProps<{ playerId: PlayerId }>()

const {
  state,
  selected,
  freeMode,
  canAct,
  toggleSelect,
  moveSelectedTo,
  playCard,
  canPlayHandCard,
  isPlayTarget,
  pendingEffect,
  isEffectTarget,
  chooseEffectTarget,
  pendingSwap,
  canSwapTarget,
  chooseSwapTarget,
  draw,
  mulligan,
  adjustResources,
  addVictoryPoints,
  sameRef,
} = useGame()

const player = computed(() => state.value?.players[props.playerId] ?? null)
const config = computed(() => state.value?.config ?? null)
const isActive = computed(() => state.value?.activePlayer === props.playerId)
const locked = computed(() => !canAct(props.playerId))
const hasSelection = computed(() => selected.value !== null && !locked.value)
/** Un ciblage est en cours (effet ou échange) : le verrou de camp est levé. */
const targeting = computed(() => pendingEffect.value !== null || pendingSwap.value !== null)

/** Carte de la main sélectionnée appartenant à ce camp (mode guidé). */
const selectedHandRef = computed<CardRef | null>(() => {
  const sel = selected.value
  if (sel && sel.zone === 'hand' && sel.player === props.playerId && !freeMode.value) return sel
  return null
})

function refFor(zone: Zone, index = 0): CardRef {
  return { player: props.playerId, zone, index }
}

function isSelected(zone: Zone, index = 0): boolean {
  return sameRef(selected.value, refFor(zone, index))
}

/** Case légale pour poser la carte de main sélectionnée (mode guidé). */
function isPlaySlot(zone: Zone, index = 0): boolean {
  return selectedHandRef.value ? isPlayTarget(selectedHandRef.value, zone, index) : false
}

/** Case ciblable par l'effet en attente (buff / redressement / renvoi / destruction). */
function isEffectSlot(zone: Zone, index = 0): boolean {
  return pendingEffect.value ? isEffectTarget(refFor(zone, index)) : false
}

/** Case ciblable pour l'échange d'emplacement en attente. */
function isSwapSlot(zone: Zone, index = 0): boolean {
  return pendingSwap.value ? canSwapTarget(refFor(zone, index)) : false
}

/** Carte de la main jouable maintenant (surlignage vert). */
function isPlayable(index: number): boolean {
  return !locked.value && canPlayHandCard(refFor('hand', index))
}

function onToken(zone: Zone, index = 0) {
  const ref = refFor(zone, index)
  // Ciblage d'un échange d'emplacement.
  if (pendingSwap.value && canSwapTarget(ref)) {
    chooseSwapTarget(ref)
    return
  }
  // Ciblage d'un effet en attente (buff / redressement / renvoi / destruction).
  if (pendingEffect.value && isEffectTarget(ref)) {
    chooseEffectTarget(ref)
    return
  }
  // Mode guidé : poser la carte de main sur une case/cible légale.
  if (selectedHandRef.value && isPlayTarget(selectedHandRef.value, zone, index)) {
    playCard(selectedHandRef.value, ref)
    return
  }
  toggleSelect(ref)
}

function onEmptySlot(zone: Zone, index: number) {
  // Mode guidé : jeu d'une carte de main avec règles/coût.
  if (selectedHandRef.value) {
    if (isPlayTarget(selectedHandRef.value, zone, index)) playCard(selectedHandRef.value, refFor(zone, index))
    return
  }
  // Mode libre : déplacement brut.
  if (hasSelection.value) moveSelectedTo(zone, index)
}

function onDropZone(zone: Zone) {
  if (selectedHandRef.value) return // en mode guidé, on passe par les cases légales
  if (hasSelection.value) moveSelectedTo(zone)
}

const lineSlots = (line: (GameCard | null)[]) => line

const dropClass = 'cursor-copy ring-1 ring-primary/50'
const playSlotClass = 'cursor-pointer ring-2 ring-emerald-500/70'
</script>

<template>
  <div
    v-if="player && config"
    class="rounded-xl border p-3 transition-all"
    :class="[
      isActive ? 'border-primary/60 bg-primary/5' : 'border-border bg-card',
      locked ? 'opacity-55 grayscale' : '',
      locked && !targeting ? 'pointer-events-none' : '',
    ]"
  >
    <!-- En-tête du camp -->
    <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
      <div class="flex items-center gap-2">
        <span class="font-engraved text-sm font-bold tracking-wide">{{ player.name }}</span>
        <span
          v-if="isActive"
          class="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground"
        >
          Tour actif
        </span>
        <span
          v-else-if="locked"
          class="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground"
        >
          <LockIcon class="size-2.5" />
          En attente
        </span>
        <span class="text-xs text-muted-foreground">{{ player.deckName }}</span>
      </div>

      <div class="flex items-center gap-3">
        <!-- Points de victoire -->
        <div class="flex items-center gap-1">
          <Trophy class="size-4 text-primary" />
          <Button variant="ghost" size="icon" class="size-6" @click="addVictoryPoints(playerId, -1)">
            <MinusIcon class="size-3" />
          </Button>
          <span class="w-8 text-center text-sm font-bold">{{ player.victoryPoints }}/{{ config.victoryTarget }}</span>
          <Button variant="ghost" size="icon" class="size-6" @click="addVictoryPoints(playerId, 1)">
            <PlusIcon class="size-3" />
          </Button>
        </div>
        <!-- Ressources -->
        <div class="flex items-center gap-1">
          <span class="text-[10px] font-medium text-muted-foreground uppercase">Ress.</span>
          <Button variant="ghost" size="icon" class="size-6" @click="adjustResources(playerId, -1)">
            <MinusIcon class="size-3" />
          </Button>
          <span class="w-5 text-center text-sm font-bold">{{ player.resources }}</span>
          <Button variant="ghost" size="icon" class="size-6" @click="adjustResources(playerId, 1)">
            <PlusIcon class="size-3" />
          </Button>
        </div>
      </div>
    </div>

    <!-- Rangée : Environnement · Artefact · Pioche · Défausse -->
    <div class="mb-3 flex flex-wrap items-start gap-3">
      <div class="flex flex-col items-center gap-1">
        <span class="text-[10px] font-medium text-muted-foreground uppercase">Environ.</span>
        <div
          class="flex aspect-[5/7] w-16 items-center justify-center rounded-md border border-dashed"
          :class="[
            isPlaySlot('environnement') ? playSlotClass : hasSelection && !player.environnement ? dropClass : '',
            'border-teal-500/40',
          ]"
          @click="!player.environnement && onEmptySlot('environnement', 0)"
        >
          <GameCardToken
            v-if="player.environnement"
            :token="player.environnement"
            :selected="isSelected('environnement')"
            :width="64"
            @click="onToken('environnement')"
          />
        </div>
      </div>

      <div class="flex flex-col items-center gap-1">
        <span class="text-[10px] font-medium text-muted-foreground uppercase">Artefact</span>
        <div
          class="flex aspect-[5/7] w-16 items-center justify-center rounded-md border border-dashed border-amber-500/40"
          :class="isPlaySlot('artefact') ? playSlotClass : hasSelection && !player.artefact ? dropClass : ''"
          @click="!player.artefact && onEmptySlot('artefact', 0)"
        >
          <GameCardToken
            v-if="player.artefact"
            :token="player.artefact"
            :selected="isSelected('artefact')"
            :width="64"
            @click="onToken('artefact')"
          />
        </div>
      </div>

      <!-- Pioche -->
      <div class="flex flex-col items-center gap-1">
        <span class="text-[10px] font-medium text-muted-foreground uppercase">Pioche</span>
        <button
          type="button"
          class="flex aspect-[5/7] w-16 flex-col items-center justify-center gap-1 rounded-md border bg-gradient-to-br from-indigo-950 to-slate-900 text-white"
          :class="hasSelection ? dropClass : ''"
          @click="hasSelection ? onDropZone('draw') : draw(playerId, 1)"
        >
          <LayersIcon class="size-5 opacity-70" />
          <span class="text-sm font-bold">{{ player.drawPile.length }}</span>
        </button>
        <Button variant="outline" size="sm" class="h-6 px-2 text-[11px]" @click="draw(playerId, 1)">Piocher</Button>
      </div>

      <!-- Défausse -->
      <div class="flex flex-col items-center gap-1">
        <span class="text-[10px] font-medium text-muted-foreground uppercase">Défausse</span>
        <button
          type="button"
          class="flex aspect-[5/7] w-16 flex-col items-center justify-center gap-1 rounded-md border border-dashed text-muted-foreground"
          :class="hasSelection ? dropClass : ''"
          @click="onDropZone('discard')"
        >
          <ArrowDownToLineIcon class="size-5 opacity-70" />
          <span class="text-sm font-bold">{{ player.discard.length }}</span>
        </button>
      </div>

      <div class="ml-auto flex flex-col items-end gap-1">
        <Button
          v-if="!player.mulliganed"
          variant="outline"
          size="sm"
          class="h-7 gap-1 text-[11px]"
          @click="mulligan(playerId)"
        >
          <RotateCcwIcon class="size-3" />
          Mulligan
        </Button>
        <span v-else class="text-[10px] text-muted-foreground">Mulligan utilisé</span>
      </div>
    </div>

    <!-- Lignes de personnages + pièges -->
    <div class="flex flex-col gap-2">
      <div>
        <span class="mb-1 block text-[10px] font-medium text-muted-foreground uppercase">Ligne arrière</span>
        <div class="flex gap-2">
          <div
            v-for="(cell, i) in lineSlots(player.back)"
            :key="`back-${i}`"
            class="flex aspect-[5/7] w-20 items-center justify-center rounded-md border border-dashed border-border"
            :class="
              isPlaySlot('back', i) || isEffectSlot('back', i) || isSwapSlot('back', i)
                ? playSlotClass
                : hasSelection && !cell
                  ? dropClass
                  : ''
            "
            @click="!cell && onEmptySlot('back', i)"
          >
            <GameCardToken
              v-if="cell"
              :token="cell"
              :selected="isSelected('back', i)"
              :width="80"
              @click="onToken('back', i)"
            />
          </div>
        </div>
      </div>

      <div>
        <span class="mb-1 block text-[10px] font-medium text-muted-foreground uppercase">Ligne avant</span>
        <div class="flex gap-2">
          <div
            v-for="(cell, i) in lineSlots(player.front)"
            :key="`front-${i}`"
            class="flex aspect-[5/7] w-20 items-center justify-center rounded-md border border-dashed border-border"
            :class="
              isPlaySlot('front', i) || isEffectSlot('front', i) || isSwapSlot('front', i)
                ? playSlotClass
                : hasSelection && !cell
                  ? dropClass
                  : ''
            "
            @click="!cell && onEmptySlot('front', i)"
          >
            <GameCardToken
              v-if="cell"
              :token="cell"
              :selected="isSelected('front', i)"
              :width="80"
              @click="onToken('front', i)"
            />
          </div>
        </div>
      </div>

      <div>
        <span class="mb-1 block text-[10px] font-medium text-muted-foreground uppercase">Pièges</span>
        <div class="flex gap-2">
          <div
            v-for="(cell, i) in lineSlots(player.traps)"
            :key="`trap-${i}`"
            class="flex aspect-[5/7] w-14 items-center justify-center rounded-md border border-dashed border-rose-500/30"
            :class="
              isPlaySlot('traps', i) || isEffectSlot('traps', i)
                ? playSlotClass
                : hasSelection && !cell
                  ? dropClass
                  : ''
            "
            @click="!cell && onEmptySlot('traps', i)"
          >
            <GameCardToken
              v-if="cell"
              :token="cell"
              :selected="isSelected('traps', i)"
              :width="56"
              @click="onToken('traps', i)"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Main -->
    <div class="mt-3">
      <div class="mb-1 flex items-center justify-between">
        <span class="text-[10px] font-medium text-muted-foreground uppercase">Main ({{ player.hand.length }})</span>
        <span v-if="selectedHandRef" class="text-[10px] text-emerald-500">Clique une case verte pour jouer</span>
        <span v-else-if="hasSelection" class="text-[10px] text-primary">Clique une zone pour déplacer</span>
      </div>
      <div
        class="flex min-h-[7rem] flex-wrap gap-2 rounded-md border border-dashed p-2"
        :class="!selectedHandRef && hasSelection ? dropClass : ''"
        @click="onDropZone('hand')"
      >
        <GameCardToken
          v-for="(cardInHand, i) in player.hand"
          :key="cardInHand.uid"
          :token="cardInHand"
          :selected="isSelected('hand', i)"
          :playable="isPlayable(i)"
          :width="72"
          @click="onToken('hand', i)"
        />
        <p v-if="player.hand.length === 0" class="self-center text-xs text-muted-foreground">Main vide</p>
      </div>
    </div>
  </div>
</template>
