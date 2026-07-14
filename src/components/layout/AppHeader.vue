<script setup lang="ts">
import MainNav from '@/components/layout/MainNav.vue'
import MobileNav from '@/components/layout/MobileNav.vue'
import UserMenu from '@/components/layout/UserMenu.vue'
</script>

<template>
  <header class="sticky top-0 z-20">
    <div
      class="pointer-events-none absolute inset-x-0 top-0 -z-10 h-24 bg-gradient-to-b from-black/85 via-black/40 to-transparent sm:hidden"
    />
    <div class="flex items-center justify-between px-4 py-3 sm:px-6 lg:px-10">
      <div class="flex items-center gap-1">
        <MobileNav />
        <RouterLink :to="{ name: 'home' }" class="font-blackletter text-3xl text-foreground"> BlueDex </RouterLink>
      </div>

      <MainNav />

      <div class="flex items-center gap-2">
        <UserMenu />
      </div>
    </div>
  </header>
</template>
