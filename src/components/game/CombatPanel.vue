<script setup lang="ts">
import { computed } from 'vue'
import { SwordsIcon, XIcon } from '@lucide/vue'
import { useGame } from '@/composables/useGame'
import { Button } from '@/components/ui/button'

const {
  state,
  combat,
  combatTotals,
  getCardAt,
  chooseColumn,
  clearSupport,
  revealableDefenderTraps,
  revealDefenderTrap,
  resolveCombat,
  cancelAttack,
} = useGame()

const totals = computed(() => combatTotals())
const traps = computed(() => revealableDefenderTraps())

const attackerName = computed(() => {
  const c = combat.value
  return c ? (getCardAt(c.attacker)?.card.name ?? '—') : '—'
})
const attackerPlayerName = computed(() => {
  const c = combat.value
  return c && state.value ? state.value.players[c.attacker.player].name : ''
})
const attackerSupportName = computed(() => {
  const ref = combat.value?.attackerSupport
  return ref ? (getCardAt(ref)?.card.name ?? null) : null
})
const defenderSupportName = computed(() => {
  const ref = combat.value?.defenderSupport
  return ref ? (getCardAt(ref)?.card.name ?? null) : null
})
</script>

<template>
  <div v-if="combat" class="rounded-xl border border-rose-500/40 bg-rose-500/5 p-4">
    <div class="mb-3 flex items-center gap-2">
      <SwordsIcon class="size-4 text-rose-500" />
      <span class="text-sm font-bold">Combat — {{ attackerPlayerName }} attaque avec {{ attackerName }}</span>
      <Button variant="ghost" size="sm" class="ml-auto" @click="cancelAttack">
        <XIcon />
        Annuler
      </Button>
    </div>

    <!-- Étape 1 : choix de la colonne -->
    <div v-if="combat.column === null" class="flex flex-col gap-2">
      <p class="text-xs text-muted-foreground">Choisis la colonne adverse ciblée (le défenseur est identifié auto).</p>
      <div class="flex gap-2">
        <Button v-for="col in [0, 1, 2]" :key="col" variant="outline" size="sm" @click="chooseColumn(col)">
          Colonne {{ col + 1 }}
        </Button>
      </div>
    </div>

    <!-- Étape 2 : soutiens + résolution -->
    <div v-else-if="totals" class="flex flex-col gap-3">
      <div class="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <!-- Attaquant -->
        <div class="rounded-lg border border-emerald-500/40 bg-emerald-500/5 p-2 text-center">
          <p class="text-[11px] text-muted-foreground uppercase">Attaquant</p>
          <p class="truncate text-sm font-medium">{{ totals.attackerName }}</p>
          <p v-if="totals.attackerFaction" class="text-[10px] text-muted-foreground">{{ totals.attackerFaction }}</p>
          <p class="text-2xl font-bold text-emerald-500">{{ totals.attackerPower }}</p>
          <p v-if="attackerSupportName" class="text-[11px] text-muted-foreground">
            + soutien {{ attackerSupportName }}
            <button class="text-primary hover:underline" @click="clearSupport('attacker')">(retirer)</button>
          </p>
        </div>

        <span class="text-lg font-bold text-muted-foreground">vs</span>

        <!-- Défenseur -->
        <div class="rounded-lg border border-rose-500/40 bg-rose-500/5 p-2 text-center">
          <p class="text-[11px] text-muted-foreground uppercase">
            Défenseur{{ totals.defenderIsEnv ? ' (Environnement)' : '' }}
          </p>
          <p class="truncate text-sm font-medium">{{ totals.defenderName }}</p>
          <p v-if="totals.defenderFaction" class="text-[10px] text-muted-foreground">{{ totals.defenderFaction }}</p>
          <p class="text-2xl font-bold text-rose-500">{{ totals.defenderPower }}</p>
          <p v-if="defenderSupportName" class="text-[11px] text-muted-foreground">
            + soutien {{ defenderSupportName }}
            <button class="text-primary hover:underline" @click="clearSupport('defender')">(retirer)</button>
          </p>
          <p v-if="totals.defenderContreAttaque" class="text-[11px] font-semibold text-amber-500">⚡ Contre-Attaque</p>
        </div>
      </div>

      <p
        class="rounded-md px-3 py-2 text-center text-sm font-semibold"
        :class="totals.attackerWins ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'"
      >
        {{
          totals.attackerWins
            ? "L'attaquant l'emporte"
            : totals.defenderContreAttaque
              ? 'Le défenseur gagne — Contre-Attaque : attaquant détruit'
              : "Le défenseur l'emporte — attaque échoue"
        }}
      </p>

      <!-- Pièges révélables (buff défenseur + faction auto) -->
      <div v-if="traps.length" class="flex flex-wrap items-center gap-2 rounded-md bg-rose-500/5 p-2">
        <span class="text-[11px] font-medium text-muted-foreground">Pièges du défenseur :</span>
        <Button v-for="t in traps" :key="t.ref.index" size="sm" variant="outline" @click="revealDefenderTrap(t.ref)">
          Révéler {{ t.name }} (+{{ t.gain }})
        </Button>
      </div>

      <p class="text-[11px] text-muted-foreground">
        Soutien : sélectionne un personnage non incliné (dans un camp) puis « Ajouter en soutien » dans la barre du
        haut. Un seul soutien par camp.
      </p>

      <div class="flex gap-2">
        <Button size="sm" @click="resolveCombat">
          <SwordsIcon />
          Résoudre l'attaque
        </Button>
        <Button variant="outline" size="sm" @click="cancelAttack">Annuler</Button>
      </div>
    </div>
  </div>
</template>
