import { createApp } from 'vue'
import { createHead } from '@unhead/vue/client'
import { VueQueryPlugin } from '@tanstack/vue-query'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import '@fontsource/pirata-one/400.css'
import '@fontsource/cinzel/700.css'
import '@fontsource/cinzel/900.css'
import './style.css'
import App from './App.vue'
import router from './router'
import { queryClient } from './lib/queryClient'
import { initAnalytics } from './lib/analytics'

const head = createHead()

createApp(App).use(head).use(router).use(VueQueryPlugin, { queryClient }).mount('#app')

initAnalytics()
