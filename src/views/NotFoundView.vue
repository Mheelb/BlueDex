<script setup lang="ts">
import { useHead } from '@unhead/vue'
import { usePageSeo } from '@/lib/seo'
import { Button } from '@/components/ui/button'

usePageSeo({ title: 'Page introuvable' })
useHead({ meta: [{ name: 'robots', content: 'noindex' }] })
</script>

<template>
  <div class="flex flex-col items-center rounded-md border border-primary/30 bg-card px-6 py-20 text-center">
    <p class="font-engraved text-xs font-bold tracking-[0.22em] text-primary uppercase">TCG · Blue Rising</p>
    <h1 class="mt-4 font-blackletter text-7xl leading-none text-foreground sm:text-8xl">404</h1>
    <p class="mt-5 max-w-md text-muted-foreground">Cette page n'existe pas, ou plus.</p>
    <Button
      as-child
      size="lg"
      class="mt-8 rounded-sm bg-primary font-engraved text-xs font-bold tracking-[0.06em] text-primary-foreground uppercase hover:bg-gold-bright"
    >
      <RouterLink :to="{ name: 'home' }">Retour à l'accueil</RouterLink>
    </Button>
  </div>
</template>
