<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { MoonIcon, SunIcon } from '@lucide/vue'
import { useAuthUser } from '@/composables/useAuthUser'
import { useDarkMode } from '@/composables/useDarkMode'
import Button from './ui/button/Button.vue'

const { session } = useAuthUser()
const { isDark, toggle } = useDarkMode()

const route = useRoute()

const tabs = [
  { name: 'sets', label: 'Sets' },
  { name: 'deck-builder', label: 'Deck Builder' },
]

const tabRefs = ref<(HTMLElement | null)[]>([])

function setTabRef(el: Element | null, index: number) {
  tabRefs.value[index] = el as HTMLElement | null
}

const indicatorStyle = ref({ width: '0px', transform: 'translateX(0px)', opacity: 0 })

function updateIndicator() {
  const index = tabs.findIndex((tab) => tab.name === route.name)
  const el = tabRefs.value[index]

  indicatorStyle.value = el
    ? { width: `${el.offsetWidth}px`, transform: `translateX(${el.offsetLeft}px)`, opacity: 1 }
    : { ...indicatorStyle.value, opacity: 0 }
}

onMounted(async () => {
  await nextTick()
  updateIndicator()
  window.addEventListener('resize', updateIndicator)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateIndicator)
})

watch(
  () => route.name,
  async () => {
    await nextTick()
    updateIndicator()
  },
)
</script>

<template>
  <header class="sticky top-0 z-20 bg-background/70 backdrop-blur-md">
    <div class="flex items-center justify-between px-4 py-3 sm:px-6 lg:px-10">
      <RouterLink :to="{ name: 'home' }" class="text-xl font-bold tracking-tight text-foreground">
        BlueDex
      </RouterLink>

      <nav class="relative hidden items-center gap-1 rounded-full border bg-card p-1 sm:flex">
        <div
          class="absolute inset-y-1 left-0 rounded-full bg-primary transition-all duration-300 ease-out"
          :style="indicatorStyle"
        />
        <div v-for="(tab, index) in tabs" :key="tab.name" :ref="(el) => setTabRef(el as Element | null, index)" class="relative z-10">
          <RouterLink
            :to="{ name: tab.name }"
            class="block rounded-full px-4 py-1.5 text-sm font-medium transition-colors"
            :class="route.name === tab.name ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground'"
          >
            {{ tab.label }}
          </RouterLink>
        </div>
      </nav>

      <div class="flex items-center gap-2">
        <!-- Bouton dark mode masqué temporairement -->
        <Button
          v-if="false"
          variant="ghost"
          size="icon"
          @click="toggle"
          :aria-label="isDark ? 'Activer le mode clair' : 'Activer le mode sombre'"
        >
          <SunIcon v-if="isDark" />
          <MoonIcon v-else />
        </Button>

        <RouterLink
          :to="session ? { name: 'admin-sets' } : { name: 'admin-login' }"
        >
          <Button variant="outline" size="lg">Admin</Button>
        </RouterLink>
      </div>
    </div>
  </header>
</template>
