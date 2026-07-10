<script setup lang="ts">
import AppHeader from '@/components/AppHeader.vue'
import AppFooter from '@/components/AppFooter.vue'
</script>

<template>
  <div class="relative isolate flex min-h-screen flex-col">
    <div class="bg-grid-fade pointer-events-none absolute inset-x-0 top-0 -z-10 h-screen" aria-hidden="true" />
    <AppHeader />
    <main class="flex-1">
      <RouterView />
    </main>
    <AppFooter />
  </div>
</template>

<style scoped>
.bg-grid-fade {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48'%3E%3Crect x='1' y='1' width='22' height='22' rx='3' ry='3' fill='none' stroke='rgba(11,32,46,0.1)' stroke-width='1'/%3E%3Crect x='25' y='25' width='22' height='22' rx='3' ry='3' fill='none' stroke='rgba(11,32,46,0.1)' stroke-width='1'/%3E%3C/svg%3E");
  background-size: 48px 48px;
  mask-image: linear-gradient(to bottom, black, transparent);
  -webkit-mask-image: linear-gradient(to bottom, black, transparent);
}

.dark .bg-grid-fade {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48'%3E%3Crect x='1' y='1' width='22' height='22' rx='3' ry='3' fill='none' stroke='rgba(255,255,255,0.1)' stroke-width='1'/%3E%3Crect x='25' y='25' width='22' height='22' rx='3' ry='3' fill='none' stroke='rgba(255,255,255,0.1)' stroke-width='1'/%3E%3C/svg%3E");
}
</style>
