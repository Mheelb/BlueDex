<script setup lang="ts">
import { computed } from 'vue'
import { ImageOffIcon, ZapIcon } from '@lucide/vue'
import { cdnImage } from '@/lib/imageCdn'
import { parseEquipPower } from '@/lib/gameRules'
import type { GameCard } from '@/types/game'

const props = withDefaults(
  defineProps<{
    token: GameCard
    selected?: boolean
    /** Carte jouable maintenant (surlignage vert). */
    playable?: boolean
    /** Largeur en pixels. */
    width?: number
  }>(),
  { selected: false, playable: false, width: 96 },
)

const emit = defineEmits<{ click: [] }>()

const src = computed(() => cdnImage(props.token.card.image_url, 240))
const equipPower = computed(() => props.token.attached.reduce((s, o) => s + parseEquipPower(o.card.effect), 0))
const totalPower = computed(() => (props.token.card.power ?? 0) + props.token.tempPower + equipPower.value)
</script>

<template>
  <button
    type="button"
    class="group relative block shrink-0 rounded-md outline-none transition-transform"
    :class="[
      token.tapped ? 'rotate-90' : '',
      selected
        ? 'ring-2 ring-primary ring-offset-2 ring-offset-background'
        : playable
          ? 'ring-2 ring-emerald-500/80'
          : '',
    ]"
    :style="{ width: `${width}px` }"
    @click.stop="emit('click')"
  >
    <div class="relative aspect-[5/7] w-full overflow-hidden rounded-md border border-border bg-slate-900 shadow">
      <!-- Face cachée -->
      <div
        v-if="token.faceDown"
        class="flex h-full w-full items-center justify-center bg-gradient-to-br from-indigo-950 to-slate-900"
      >
        <div class="size-1/2 rounded-full border-2 border-primary/40" />
      </div>
      <template v-else>
        <img v-if="src" :src="src" :alt="token.card.name" class="h-full w-full object-cover" loading="lazy" />
        <div
          v-else
          class="flex h-full w-full flex-col items-center justify-center gap-1 bg-muted text-muted-foreground"
        >
          <ImageOffIcon class="size-5" />
          <span class="px-1 text-center text-[9px] leading-tight">{{ token.card.name }}</span>
        </div>
      </template>

      <!-- Puissance (personnage) -->
      <span
        v-if="!token.faceDown && token.card.power !== null && token.card.type === 'Personnage'"
        class="absolute bottom-0.5 left-0.5 flex min-w-4 items-center justify-center rounded bg-black/75 px-1 text-[10px] font-bold text-white"
        :class="token.tempPower || equipPower ? 'text-emerald-300' : ''"
      >
        {{ totalPower }}
      </span>
      <!-- Coût -->
      <span
        v-if="!token.faceDown && token.card.cost !== null"
        class="absolute top-0.5 right-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground"
      >
        {{ token.card.cost }}
      </span>
    </div>

    <!-- Désorientation -->
    <span
      v-if="token.sick && !token.faceDown"
      class="absolute top-0.5 left-0.5 rounded bg-sky-600/90 px-1 text-[8px] font-bold text-white shadow"
      title="Désorienté : ne peut pas attaquer ce tour"
    >
      Zzz
    </span>

    <!-- Badges d'état -->
    <span
      v-if="token.tempPower"
      class="absolute -top-1.5 -left-1.5 flex items-center gap-0.5 rounded-full bg-emerald-600 px-1 text-[9px] font-bold text-white shadow"
    >
      <ZapIcon class="size-2.5" />{{ token.tempPower > 0 ? '+' : '' }}{{ token.tempPower }}
    </span>
    <span
      v-if="token.attached.length"
      class="absolute -right-1.5 -bottom-1.5 flex size-4 items-center justify-center rounded-full bg-violet-600 text-[9px] font-bold text-white shadow"
      :title="token.attached.map((o) => o.card.name).join(', ')"
    >
      {{ token.attached.length }}
    </span>
  </button>
</template>
