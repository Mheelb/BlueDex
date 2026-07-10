<script setup lang="ts">
const year = new Date().getFullYear()
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
            <RouterLink :to="{ name: 'sets' }" class="text-muted-foreground hover:text-foreground">Sets</RouterLink>
            <RouterLink :to="{ name: 'deck-builder' }" class="text-muted-foreground hover:text-foreground">
              Deck Builder
            </RouterLink>
            <RouterLink :to="{ name: 'articles' }" class="text-muted-foreground hover:text-foreground">Actus</RouterLink>
          </div>

          <div class="flex flex-col gap-2">
            <p class="font-medium text-foreground">Admin</p>
            <RouterLink :to="{ name: 'admin-login' }" class="text-muted-foreground hover:text-foreground">
              Connexion
            </RouterLink>
          </div>
        </nav>
      </div>

      <div class="mt-8 border-t pt-6 text-xs text-muted-foreground">
        © {{ year }} BlueDex · Projet non affilié à l'éditeur de Blue Rising.
      </div>
    </div>
  </footer>
</template>
