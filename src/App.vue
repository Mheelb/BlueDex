<script setup lang="ts">
import { defineAsyncComponent } from 'vue'
import { useHead } from '@unhead/vue'
import 'vue-sonner/style.css'
import { Toaster } from 'vue-sonner'
import { DEFAULT_DESCRIPTION, DEFAULT_OG_IMAGE, SITE_NAME } from '@/lib/seo'
import AppHeader from '@/components/layout/AppHeader.vue'
import AppFooter from '@/components/layout/AppFooter.vue'
import PageContainer from '@/components/layout/PageContainer.vue'

// Valeurs SEO par défaut, surchargées page par page via usePageSeo().
useHead({
  htmlAttrs: { lang: 'fr' },
  titleTemplate: (title) => (title ? `${title} · ${SITE_NAME}` : SITE_NAME),
  meta: [
    { name: 'description', content: DEFAULT_DESCRIPTION },
    { property: 'og:site_name', content: SITE_NAME },
    { property: 'og:type', content: 'website' },
    { property: 'og:image', content: DEFAULT_OG_IMAGE },
    { property: 'og:locale', content: 'fr_FR' },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:image', content: DEFAULT_OG_IMAGE },
  ],
})

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
