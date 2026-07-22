/* eslint-disable vue/one-component-per-file -- composants stubs pour monter le composable */
import { describe, expect, it } from 'vitest'
import { defineComponent, nextTick } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import type { Router } from 'vue-router'
import { useCardFiltersQuery } from '@/composables/useCardFiltersQuery'
import type { UseCardFiltersQueryResult } from '@/composables/useCardFiltersQuery'

async function setup(initialUrl = '/sets/base') {
  let api!: UseCardFiltersQueryResult
  const Host = defineComponent({
    setup() {
      api = useCardFiltersQuery({ flags: ['missing'] })
      return () => null
    },
  })
  const Detail = defineComponent({ setup: () => () => null })

  const router: Router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/sets/:setSlug', name: 'set', component: Host },
      { path: '/sets/:setSlug/cards/:cardNumber', name: 'card', component: Detail },
    ],
  })
  router.push(initialUrl)
  await router.isReady()

  const wrapper = mount({ template: '<router-view />' }, { global: { plugins: [router] } })
  await nextTick()
  return { api: () => api, router, wrapper }
}

describe('useCardFiltersQuery', () => {
  it('initialise les filtres depuis la query au montage', async () => {
    const { api } = await setup('/sets/base?q=dragon&rarity=rare&sort=name-desc')
    expect(api().filters.value.search).toBe('dragon')
    expect(api().filters.value.rarity).toEqual(['Rare'])
    expect(api().filters.value.sort).toBe('name-desc')
  })

  it("pousse les changements de filtres dans l'URL via replace", async () => {
    const { api, router } = await setup()
    api().filters.value = { ...api().filters.value, search: 'aile', type: ['Personnage'] }
    await flushPromises()
    expect(router.currentRoute.value.query).toMatchObject({ q: 'aile', type: 'personnage' })
  })

  it('nettoie les paramètres revenus à leur défaut', async () => {
    const { api, router } = await setup('/sets/base?q=aile&type=personnage')
    api().filters.value = { ...api().filters.value, type: [] }
    await flushPromises()
    expect(router.currentRoute.value.query.type).toBeUndefined()
    expect(router.currentRoute.value.query.q).toBe('aile')
  })

  it('restaure les filtres après un aller-retour vers le détail (back)', async () => {
    const { api, router } = await setup()
    api().filters.value = { ...api().filters.value, search: 'phoenix' }
    await flushPromises()

    await router.push({ name: 'card', params: { setSlug: 'base', cardNumber: '001' } })
    await nextTick()

    await router.back()
    await flushPromises()

    expect(router.currentRoute.value.query.q).toBe('phoenix')
    expect(api().filters.value.search).toBe('phoenix')
  })

  it('synchronise le drapeau « cartes manquantes »', async () => {
    const { api, router } = await setup()
    api().flags.missing = true
    await flushPromises()
    expect(router.currentRoute.value.query.missing).toBe('1')
  })

  it('préserve les paramètres de query non gérés', async () => {
    const { api, router } = await setup('/sets/base?ref=share')
    api().filters.value = { ...api().filters.value, search: 'x' }
    await flushPromises()
    expect(router.currentRoute.value.query.ref).toBe('share')
    expect(router.currentRoute.value.query.q).toBe('x')
  })
})
