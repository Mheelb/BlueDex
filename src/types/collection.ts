import type { CardSet } from '@/types/card'

export interface SetCollectionProgress {
  set: CardSet
  owned: number
  total: number
}
