<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { LayoutDashboardIcon, LibraryIcon, LogOutIcon, NewspaperIcon } from '@lucide/vue'
import { useAuthUser } from '@/composables/useAuthUser'
import { useProfile } from '@/composables/useProfile'
import { supabase } from '@/lib/supabase'
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
      <DropdownMenuItem as-child>
        <RouterLink :to="{ name: 'collection' }">
          <LibraryIcon />
          Ma collection
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
        <DropdownMenuSeparator />
      </template>
      <DropdownMenuItem variant="destructive" @click="onLogout">
        <LogOutIcon />
        Déconnexion
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>

  <RouterLink v-else :to="{ name: 'login' }">
    <Button
      variant="outline"
      size="lg"
      class="rounded-sm border-primary/60 bg-transparent font-engraved text-xs font-bold tracking-[0.06em] text-primary uppercase hover:bg-white/5 hover:text-gold-bright"
    >
      Connexion
    </Button>
  </RouterLink>
</template>
