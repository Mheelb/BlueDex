<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { LayoutDashboardIcon, LogOutIcon, MoonIcon, NewspaperIcon, SunIcon } from '@lucide/vue'
import { useAuthUser } from '@/composables/useAuthUser'
import { useProfile } from '@/composables/useProfile'
import { useDarkMode } from '@/composables/useDarkMode'
import { supabase } from '@/lib/supabase'
import Button from './ui/button/Button.vue'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const { session } = useAuthUser()
const { data: profile, isAdmin } = useProfile()
const { isDark, toggle } = useDarkMode()
const router = useRouter()

const userInitials = computed(() => {
  const name = profile.value?.display_name ?? session.value?.user.email ?? ''
  return name.slice(0, 2).toUpperCase() || '?'
})

async function onLogout() {
  await supabase.auth.signOut()
  router.push({ name: 'home' })
}

const route = useRoute()

const tabs = [
  { name: 'sets', label: 'Sets', matchPrefix: '/sets' },
  { name: 'deck-builder', label: 'Deck Builder', matchPrefix: '/decks' },
  { name: 'articles', label: 'Actus', matchPrefix: '/actus' },
]

function isTabActive(tab: (typeof tabs)[number]) {
  return route.path.startsWith(tab.matchPrefix)
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
  await nextTick()
  updateIndicator()
  window.addEventListener('resize', updateIndicator)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateIndicator)
})

watch(
  () => route.path,
  async () => {
    await nextTick()
    updateIndicator()
  },
)
</script>

<template>
  <header class="sticky top-0 z-20">
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
            :class="isTabActive(tab) ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground'"
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

        <DropdownMenu v-if="session">
          <DropdownMenuTrigger as-child>
            <button class="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Avatar>
                <AvatarImage v-if="profile?.avatar_url" :src="profile.avatar_url" />
                <AvatarFallback class="bg-primary text-primary-foreground">{{ userInitials }}</AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" class="w-56">
            <DropdownMenuLabel class="truncate font-normal text-muted-foreground">
              {{ profile?.display_name ?? session.user.email }}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <template v-if="isAdmin">
              <DropdownMenuItem as-child>
                <RouterLink :to="{ name: 'admin-sets' }">
                  <LayoutDashboardIcon />
                  Dashboard
                </RouterLink>
              </DropdownMenuItem>
              <DropdownMenuItem as-child>
                <RouterLink :to="{ name: 'admin-articles' }">
                  <NewspaperIcon />
                  Articles
                </RouterLink>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </template>
            <DropdownMenuItem variant="destructive" @click="onLogout">
              <LogOutIcon />
              Déconnexion
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <RouterLink v-else :to="{ name: 'login' }">
          <Button variant="outline" size="lg">Connexion</Button>
        </RouterLink>
      </div>
    </div>
  </header>
</template>
