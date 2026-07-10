import { createApp } from 'vue'
import { VueQueryPlugin } from '@tanstack/vue-query'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import './style.css'
import App from './App.vue'
import router from './router'
import { queryClient } from './lib/queryClient'

createApp(App)
  .use(router)
  .use(VueQueryPlugin, { queryClient })
  .mount('#app')
