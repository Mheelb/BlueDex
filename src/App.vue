<script setup lang="ts">
import { defineAsyncComponent } from 'vue'
import 'vue-sonner/style.css'
import { Toaster } from 'vue-sonner'
import AppHeader from '@/components/AppHeader.vue'
import AppFooter from '@/components/AppFooter.vue'
import PageContainer from '@/components/PageContainer.vue'

const VueQueryDevtools = import.meta.env.DEV
  ? defineAsyncComponent(() => import('@tanstack/vue-query-devtools').then((m) => m.VueQueryDevtools))
  : null
</script>

<template>
  <div
    class="relative isolate flex min-h-screen flex-col bg-[linear-gradient(135deg,#2a4066_0%,#131b2e_50%,#131b2e_78%,#4a3a20_100%)] text-foreground"
  >
    <div class="bg-grid-fade pointer-events-none absolute inset-x-0 top-0 -z-10 h-screen" aria-hidden="true" />
    <AppHeader />
    <main class="flex-1">
      <PageContainer>
        <RouterView />
      </PageContainer>
    </main>
    <AppFooter />
    <Toaster theme="dark" />
    <component :is="VueQueryDevtools" v-if="VueQueryDevtools" />
  </div>
</template>

<style scoped>
.bg-grid-fade {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48'%3E%3Crect x='1' y='1' width='22' height='22' rx='3' ry='3' fill='none' stroke='rgba(255,255,255,0.1)' stroke-width='1'/%3E%3Crect x='25' y='25' width='22' height='22' rx='3' ry='3' fill='none' stroke='rgba(255,255,255,0.1)' stroke-width='1'/%3E%3C/svg%3E");
  background-size: 48px 48px;
  mask-image: linear-gradient(to bottom, black, transparent);
  -webkit-mask-image: linear-gradient(to bottom, black, transparent);
}
</style>
