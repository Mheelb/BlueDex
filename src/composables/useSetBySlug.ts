import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import type { CardSet } from '@/types/card'

export function useSetBySlug() {
  const set = ref<CardSet | null>(null)
  const error = ref<string | null>(null)

  async function loadSet(slug: string): Promise<boolean> {
    const { data, error: fetchError } = await supabase
      .from('sets')
      .select('*')
      .eq('slug', slug)
      .single()

    if (fetchError || !data) {
      set.value = null
      error.value = fetchError?.message ?? 'Set introuvable.'
      return false
    }

    set.value = data as CardSet
    error.value = null
    return true
  }

  return { set, error, loadSet }
}
