<script setup lang="ts">
import MainNav from '@/components/layout/MainNav.vue'
import UserMenu from '@/components/layout/UserMenu.vue'
</script>

<template>
  <header class="sticky top-0 z-20">
    <div class="flex items-center justify-between px-4 py-3 sm:px-6 lg:px-10">
      <RouterLink :to="{ name: 'home' }" class="font-blackletter text-3xl text-foreground">
        BlueDex
      </RouterLink>

      <MainNav />

      <div class="flex items-center gap-2">
        <UserMenu />
      </div>
    </div>
  </header>
</template>
