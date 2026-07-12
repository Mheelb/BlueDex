<script setup lang="ts">
import { useRouter } from 'vue-router'
import TextLink from '@/components/common/TextLink.vue'
import { useAuthUser } from '@/composables/useAuthUser'
import { supabase } from '@/lib/supabase'

const year = new Date().getFullYear()

const { session } = useAuthUser()
const router = useRouter()

async function onLogout() {
  await supabase.auth.signOut()
  router.push({ name: 'home' })
}
</script>

<template>
  <footer class="mt-16 border-t">
    <div class="mx-auto max-w-screen-2xl px-4 py-10 sm:px-6 lg:px-10">
      <div class="flex flex-col gap-8 sm:flex-row sm:justify-between">
        <div>
          <p class="text-lg font-bold tracking-tight text-foreground">BlueDex</p>
          <p class="mt-2 max-w-sm text-sm text-muted-foreground">
            Base de données non-officielle du TCG Blue Rising, réalisée par des fans pour des fans.
          </p>
        </div>

        <nav class="flex flex-wrap gap-x-8 gap-y-4 text-sm">
          <div class="flex flex-col gap-2">
            <p class="font-medium text-foreground">Naviguer</p>
            <TextLink :to="{ name: 'sets' }">Sets</TextLink>
            <TextLink :to="{ name: 'deck-builder' }">
              Deck Builder
            </TextLink>
            <TextLink :to="{ name: 'articles' }">Actus</TextLink>
          </div>

          <div class="flex flex-col gap-2">
            <p class="font-medium text-foreground">Compte</p>
            <button
              v-if="session"
              type="button"
              class="text-left text-muted-foreground hover:text-foreground"
              @click="onLogout"
            >
              Déconnexion
            </button>
            <TextLink v-else :to="{ name: 'login' }">
              Connexion
            </TextLink>
          </div>

          <div class="flex flex-col gap-2">
            <p class="font-medium text-foreground">Légal</p>
            <TextLink :to="{ name: 'legal-notice' }">Mentions légales</TextLink>
            <TextLink :to="{ name: 'privacy-policy' }">Confidentialité</TextLink>
          </div>
        </nav>
      </div>

      <div class="mt-8 border-t pt-6 text-xs text-muted-foreground">
        © {{ year }} BlueDex · Projet non affilié à l'éditeur de Blue Rising.
      </div>
    </div>
  </footer>
</template>
