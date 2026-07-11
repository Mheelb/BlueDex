import { createRouter, createWebHistory } from 'vue-router'
import { supabase } from '@/lib/supabase'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/home/SetsView.vue'),
    },
    {
      path: '/sets',
      name: 'sets',
      component: () => import('@/views/sets/AllSetsView.vue'),
    },
    {
      path: '/decks',
      name: 'deck-builder',
      component: () => import('@/views/deckbuilder/DeckBuilderView.vue'),
    },
    {
      path: '/decks/builder',
      name: 'deck-builder-new',
      component: () => import('@/views/deckbuilder/DeckEditorView.vue'),
    },
    {
      path: '/decks/builder/:deckId',
      name: 'deck-builder-edit',
      component: () => import('@/views/deckbuilder/DeckEditorView.vue'),
      props: true,
    },
    {
      path: '/actus',
      name: 'articles',
      component: () => import('@/views/articles/ArticlesView.vue'),
    },
    {
      path: '/actus/:slug',
      name: 'article',
      component: () => import('@/views/articles/ArticleView.vue'),
      props: true,
    },
    {
      path: '/sets/:setSlug',
      name: 'set',
      component: () => import('@/views/sets/SetView.vue'),
      props: true,
    },
    {
      path: '/sets/:setSlug/cards/:cardNumber',
      name: 'card',
      component: () => import('@/views/cards/CardView.vue'),
      props: true,
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/auth/LoginView.vue'),
    },
    {
      path: '/signup',
      name: 'signup',
      component: () => import('@/views/auth/SignupView.vue'),
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
    {
      path: '/admin/articles',
      name: 'admin-articles',
      component: () => import('@/views/admin/AdminArticlesView.vue'),
    },
  ],
})

router.beforeEach(async (to) => {
  const requiresSession = to.name === 'deck-builder-new' || to.name === 'deck-builder-edit'
  const requiresAdmin = to.name === 'admin-sets' || to.name === 'admin-set-cards' || to.name === 'admin-articles'
  if (!requiresSession && !requiresAdmin) return true

  const { data } = await supabase.auth.getSession()
  if (!data.session) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  if (requiresAdmin) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', data.session.user.id)
      .single()
    if (!profile?.is_admin) {
      return { name: 'login', query: { redirect: to.fullPath } }
    }
  }

  return true
})

export default router
