import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import BackButton from '@/components/common/BackButton.vue'

describe('BackButton', () => {
  it('renders the label and links to the given route', () => {
    const wrapper = mount(BackButton, {
      props: { to: { name: 'articles' }, label: 'Retour aux actus' },
      global: { stubs: { RouterLink: { template: '<a><slot /></a>', props: ['to'] } } },
    })

    expect(wrapper.text()).toContain('Retour aux actus')
  })
})
