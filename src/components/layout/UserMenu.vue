<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { BotIcon, LayoutDashboardIcon, LibraryIcon, LogOutIcon, NewspaperIcon, SwordsIcon, UserIcon } from '@lucide/vue'
import { useAuthUser } from '@/composables/useAuthUser'
import { useProfile } from '@/composables/useProfile'
import { supabase } from '@/lib/supabase'
import { cdnImage } from '@/lib/imageCdn'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
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
const router = useRouter()

const userInitials = computed(() => {
  const name = profile.value?.display_name ?? session.value?.user.email ?? ''
  return name.slice(0, 2).toUpperCase() || '?'
})

async function onLogout() {
  await supabase.auth.signOut()
  router.push({ name: 'home' })
}
</script>

<template>
  <DropdownMenu v-if="session">
    <DropdownMenuTrigger as-child>
      <button class="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <Avatar>
          <AvatarImage v-if="profile?.avatar_url" :src="cdnImage(profile.avatar_url, 96)!" />
          <AvatarFallback class="bg-primary text-primary-foreground">{{ userInitials }}</AvatarFallback>
        </Avatar>
      </button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" class="w-56">
      <DropdownMenuLabel class="truncate font-normal text-muted-foreground">
        {{ profile?.display_name ?? session.user.email }}
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem as-child>
        <RouterLink :to="{ name: 'collection' }">
          <LibraryIcon />
          Ma collection
        </RouterLink>
      </DropdownMenuItem>
      <DropdownMenuItem as-child>
        <RouterLink :to="{ name: 'profile' }">
          <UserIcon />
          Mon profil
        </RouterLink>
      </DropdownMenuItem>
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
        <DropdownMenuItem as-child>
          <RouterLink :to="{ name: 'admin-game' }">
            <SwordsIcon />
            Partie test
          </RouterLink>
        </DropdownMenuItem>
        <DropdownMenuItem as-child>
          <RouterLink :to="{ name: 'admin-game-ai' }">
            <BotIcon />
            Partie vs IA
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

  <div v-else class="flex items-center gap-2">
    <RouterLink :to="{ name: 'signup' }" class="hidden sm:block">
      <Button
        size="lg"
        class="rounded-sm bg-primary font-engraved text-xs font-bold tracking-[0.06em] text-primary-foreground uppercase hover:bg-gold-bright"
      >
        S'inscrire
      </Button>
    </RouterLink>
    <RouterLink :to="{ name: 'login' }">
      <Button
        variant="outline"
        size="lg"
        class="rounded-sm border-primary/60 bg-transparent font-engraved text-xs font-bold tracking-[0.06em] text-primary uppercase hover:bg-white/5 hover:text-gold-bright"
      >
        Connexion
      </Button>
    </RouterLink>
  </div>
</template>
