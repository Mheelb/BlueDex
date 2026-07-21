import { supabase } from '@/lib/supabase'

const DIACRITICS = /[̀-ͯ]/g

/** Normalise un nom de carte pour le rapprochement moteur ↔ BDD (sans accents/casse). */
export function normalizeName(name: string): string {
  return name
    .normalize('NFD')
    .replace(DIACRITICS, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/** Table nom normalisé → image_url, pour afficher l'art des cartes du moteur. */
export async function fetchCardImages(): Promise<Record<string, string>> {
  const { data, error } = await supabase.from('cards').select('name, image_url')
  if (error) throw new Error(error.message)
  const map: Record<string, string> = {}
  for (const row of (data ?? []) as { name: string; image_url: string | null }[]) {
    if (row.image_url && row.name) {
      const key = normalizeName(row.name)
      if (!map[key]) map[key] = row.image_url
    }
  }
  return map
}
