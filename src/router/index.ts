import { createRouter, createWebHistory } from 'vue-router'
import { ensureAuthReady, useAuthUser } from '@/composables/useAuthUser'
import { queryClient } from '@/lib/queryClient'
import { fetchProfile, profileKeys } from '@/queries/profile'

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
    requiresAdmin?: boolean
  }
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior(to, _from, savedPosition) {
    if (savedPosition) return savedPosition
    if (to.hash) return { el: to.hash, behavior: 'smooth' }
    return { top: 0 }
  },
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
      meta: { requiresAuth: true },
    },
    {
      path: '/decks/builder/:deckId',
      name: 'deck-builder-edit',
      component: () => import('@/views/deckbuilder/DeckEditorView.vue'),
      props: true,
      meta: { requiresAuth: true },
    },
    {
      path: '/decks/:deckId',
      name: 'deck-detail',
      component: () => import('@/views/deckbuilder/DeckDetailView.vue'),
      props: true,
    },
    {
      path: '/collection',
      name: 'collection',
      component: () => import('@/views/collection/CollectionView.vue'),
      meta: { requiresAuth: true },
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
      path: '/profil',
      name: 'profile',
      component: () => import('@/views/auth/ProfileView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/admin/sets',
      name: 'admin-sets',
      component: () => import('@/views/admin/AdminSetsView.vue'),
      meta: { requiresAdmin: true },
    },
    {
      path: '/admin/sets/:setSlug',
      name: 'admin-set-cards',
      component: () => import('@/views/admin/AdminSetCardsView.vue'),
      props: true,
      meta: { requiresAdmin: true },
    },
    {
      path: '/admin/articles',
      name: 'admin-articles',
      component: () => import('@/views/admin/AdminArticlesView.vue'),
      meta: { requiresAdmin: true },
    },
    {
      path: '/mentions-legales',
      name: 'legal-notice',
      component: () => import('@/views/legal/LegalNoticeView.vue'),
    },
    {
      path: '/confidentialite',
      name: 'privacy-policy',
      component: () => import('@/views/legal/PrivacyPolicyView.vue'),
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/views/NotFoundView.vue'),
    },
  ],
})

router.beforeEach(async (to) => {
  const requiresAuth = to.meta.requiresAuth ?? false
  const requiresAdmin = to.meta.requiresAdmin ?? false
  if (!requiresAuth && !requiresAdmin) return true

  await ensureAuthReady()
  const { session } = useAuthUser()
  if (!session.value) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  if (requiresAdmin) {
    const userId = session.value.user.id
    try {
      const profile = await queryClient.ensureQueryData({
        queryKey: profileKeys.detail(userId),
        queryFn: () => fetchProfile(userId),
      })
      if (!profile.is_admin) {
        return { name: 'login', query: { redirect: to.fullPath } }
      }
    } catch {
      return { name: 'login', query: { redirect: to.fullPath } }
    }
  }

  return true
})

export default router
