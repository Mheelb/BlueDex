<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { HouseIcon } from '@lucide/vue'

const route = useRoute()
const router = useRouter()

interface NavTab {
  name: string
  label: string
  matchPrefix?: string
  icon?: typeof HouseIcon
}

const tabs: NavTab[] = [
  { name: 'home', label: 'Accueil', icon: HouseIcon },
  { name: 'sets', label: 'Sets', matchPrefix: '/sets' },
  { name: 'deck-builder', label: 'Deck Builder', matchPrefix: '/decks' },
  { name: 'articles', label: 'Actus', matchPrefix: '/actus' },
]

// La home ("/") est un préfixe de toutes les routes, donc elle ne peut pas
// être comparée avec startsWith comme les autres onglets : on se base sur le
// nom de route exact.
function isTabActive(tab: NavTab) {
  return tab.matchPrefix ? route.path.startsWith(tab.matchPrefix) : route.name === tab.name
}

const tabRefs = ref<(HTMLElement | null)[]>([])

function setTabRef(el: Element | null, index: number) {
  tabRefs.value[index] = el as HTMLElement | null
}

const indicatorStyle = ref({ width: '0px', transform: 'translateX(0px)', opacity: 0 })

function updateIndicator() {
  const index = tabs.findIndex((tab) => isTabActive(tab))
  const el = tabRefs.value[index]

  indicatorStyle.value = el
    ? { width: `${el.offsetWidth}px`, transform: `translateX(${el.offsetLeft}px)`, opacity: 1 }
    : { ...indicatorStyle.value, opacity: 0 }
}

onMounted(async () => {
  await router.isReady()
  await nextTick()
  updateIndicator()
  window.addEventListener('resize', updateIndicator)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateIndicator)
})

watch(
  () => [route.path, route.name],
  async () => {
    await nextTick()
    updateIndicator()
  },
)
</script>

<template>
  <nav
    class="relative hidden items-center gap-1 rounded-full border border-primary/35 bg-card p-1 shadow-[0_2px_10px_rgba(0,0,0,0.35)] sm:flex"
  >
    <div
      class="absolute inset-y-1 left-0 rounded-full bg-primary transition-all duration-300 ease-out"
      :style="indicatorStyle"
    />
    <div
      v-for="(tab, index) in tabs"
      :key="tab.name"
      :ref="(el) => setTabRef(el as Element | null, index)"
      class="relative z-10"
    >
      <RouterLink
        :to="{ name: tab.name }"
        class="flex items-center justify-center rounded-full text-sm font-medium transition-colors"
        :class="[
          tab.icon ? 'size-8' : 'px-4 py-1.5',
          isTabActive(tab) ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
        ]"
      >
        <component :is="tab.icon" v-if="tab.icon" class="size-4" />
        <span v-else>{{ tab.label }}</span>
        <span v-if="tab.icon" class="sr-only">{{ tab.label }}</span>
      </RouterLink>
    </div>
  </nav>
</template>
