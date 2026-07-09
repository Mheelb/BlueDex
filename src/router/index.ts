import { createRouter, createWebHistory } from 'vue-router'
import { supabase } from '@/lib/supabase'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/SetsView.vue'),
    },
    {
      path: '/sets',
      name: 'sets',
      component: () => import('@/views/AllSetsView.vue'),
    },
    {
      path: '/decks',
      name: 'deck-builder',
      component: () => import('@/views/DeckBuilderView.vue'),
    },
    {
      path: '/sets/:setSlug',
      name: 'set',
      component: () => import('@/views/SetView.vue'),
      props: true,
    },
    {
      path: '/sets/:setSlug/cards/:cardNumber',
      name: 'card',
      component: () => import('@/views/CardView.vue'),
      props: true,
    },
    {
      path: '/admin',
      name: 'admin-login',
      component: () => import('@/views/admin/AdminLoginView.vue'),
    },
    {
      path: '/admin/sets',
      name: 'admin-sets',
      component: () => import('@/views/admin/AdminSetsView.vue'),
    },
    {
      path: '/admin/sets/:setSlug',
      name: 'admin-set-cards',
      component: () => import('@/views/admin/AdminSetCardsView.vue'),
      props: true,
    },
  ],
})

router.beforeEach(async (to) => {
  const requiresAuth = to.name === 'admin-sets' || to.name === 'admin-set-cards'
  if (!requiresAuth) return true

  const { data } = await supabase.auth.getSession()
  if (!data.session) {
    return { name: 'admin-login', query: { redirect: to.fullPath } }
  }
  return true
})

export default router
