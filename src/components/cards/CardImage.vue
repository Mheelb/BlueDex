<script setup lang="ts">
import { reactive, ref } from 'vue'
import { ImageOffIcon } from '@lucide/vue'

const props = defineProps<{
  src: string | null
  alt: string
  isHolo?: boolean
}>()

const tiltEl = ref<HTMLElement | null>(null)
const hovering = ref(false)

const tilt = reactive({
  rotateX: 0,
  rotateY: 0,
  glareX: 50,
  glareY: 50,
})

const MAX_TILT_DEG = 12

function onPointerMove(event: PointerEvent) {
  const el = tiltEl.value
  if (!el) return

  const rect = el.getBoundingClientRect()
  const px = (event.clientX - rect.left) / rect.width
  const py = (event.clientY - rect.top) / rect.height

  tilt.rotateX = (0.5 - py) * MAX_TILT_DEG * 2
  tilt.rotateY = (px - 0.5) * MAX_TILT_DEG * 2
  tilt.glareX = px * 100
  tilt.glareY = py * 100
}

function onPointerEnter() {
  hovering.value = true
}

function onPointerLeave() {
  hovering.value = false
  tilt.rotateX = 0
  tilt.rotateY = 0
  tilt.glareX = 50
  tilt.glareY = 50
}
</script>

<template>
  <div style="perspective: 1000px">
    <div
      ref="tiltEl"
      class="card-tile relative aspect-[5/7] rounded-xl overflow-hidden bg-slate-900 shadow-lg"
      :class="{ 'card-tile--hovering': hovering, 'card-tile--holo': props.isHolo }"
      :style="{
        '--rx': `${tilt.rotateX}deg`,
        '--ry': `${tilt.rotateY}deg`,
        '--gx': `${tilt.glareX}%`,
        '--gy': `${tilt.glareY}%`,
      }"
      @pointerenter="onPointerEnter"
      @pointermove="onPointerMove"
      @pointerleave="onPointerLeave"
    >
      <img v-if="props.src" :src="props.src" :alt="props.alt" class="h-full w-full object-cover" loading="lazy" />
      <div v-else class="flex h-full w-full flex-col items-center justify-center gap-2 bg-muted text-muted-foreground">
        <ImageOffIcon class="size-10" />
        <span class="text-xs">Pas d'image</span>
      </div>
      <div v-if="props.isHolo" class="card-tile__holo-shine pointer-events-none absolute inset-0" />
    </div>
  </div>
</template>

<style scoped>
.card-tile {
  transform: rotateX(var(--rx)) rotateY(var(--ry)) scale(1);
  transform-style: preserve-3d;
  transition: transform 0.35s ease-out;
  will-change: transform;
}

.card-tile--hovering {
  transition: transform 0.06s ease-out;
  transform: rotateX(var(--rx)) rotateY(var(--ry)) scale(1.08);
}

.card-tile__holo-shine {
  opacity: 0;
  background:
    radial-gradient(
      circle at var(--gx) var(--gy),
      rgba(255, 255, 255, 0.85) 0%,
      rgba(255, 255, 255, 0.15) 35%,
      transparent 60%
    ),
    conic-gradient(from 0deg at var(--gx) var(--gy), #ff8fa8, #ffd88f, #8fc6ff, #8fffc0, #fff08f, #ff8fa8);
  background-blend-mode: overlay, normal;
  mix-blend-mode: overlay;
  transition: opacity 0.3s ease-out;
}

.card-tile--holo.card-tile--hovering .card-tile__holo-shine {
  opacity: 0.65;
}

/* Mobile : le tilt au toucher n'a pas de sens (pas de vrai hover), et
   laisser le doigt déclencher l'effet est peu fiable. On désactive le tilt
   et on remplace le holo par un liseret qui balaie la carte automatiquement. */
@media (max-width: 639.98px) {
  .card-tile,
  .card-tile--hovering {
    transition: none;
    transform: none;
  }

  .card-tile--holo .card-tile__holo-shine {
    opacity: 0.55;
    background: linear-gradient(
      115deg,
      transparent 20%,
      rgba(255, 143, 168, 0.55) 35%,
      rgba(255, 216, 143, 0.55) 42%,
      rgba(143, 198, 255, 0.55) 49%,
      rgba(143, 255, 192, 0.55) 56%,
      transparent 70%
    );
    background-size: 250% 250%;
    animation: card-tile-holo-sweep 3.5s ease-in-out infinite;
  }
}

@keyframes card-tile-holo-sweep {
  0%,
  100% {
    background-position: 0% 0%;
  }
  50% {
    background-position: 100% 100%;
  }
}

@media (max-width: 639.98px) and (prefers-reduced-motion: reduce) {
  .card-tile--holo .card-tile__holo-shine {
    animation: none;
    background-position: 50% 50%;
  }
}
</style>
