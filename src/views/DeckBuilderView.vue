<script setup lang="ts">
import { PlusIcon } from '@lucide/vue'
import Heading from '@/components/Heading.vue'
import { Button } from '@/components/ui/button'
</script>

<template>
  <Heading size="2xl">Deck Builder</Heading>
  <p class="mt-2 text-muted-foreground">
    La liste de tes decks arrive bientôt. En attendant, tu peux déjà construire un deck.
  </p>
  <Button as-child class="mt-4">
    <RouterLink :to="{ name: 'deck-builder-new' }">
      <PlusIcon />
      Créer un deck
    </RouterLink>
  </Button>
</template>
