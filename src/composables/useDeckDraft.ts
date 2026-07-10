import { ref } from 'vue'
import type { DeckEntry, DeckFormat } from '@/types/deck'

export interface DeckDraft {
  name: string
  format: DeckFormat
  entries: DeckEntry[]
}

// Transfère la copie d'un deck consulté vers l'écran "Nouveau deck" sans
// aller-retour serveur : setDraft() est appelé juste avant de naviguer,
// takeDraft() est lu une seule fois au montage puis vidé, pour ne pas
// réutiliser un vieux brouillon si l'utilisateur revient sur /decks/builder
// plus tard sans être passé par "Dupliquer".
const draft = ref<DeckDraft | null>(null)

export function useDeckDraft() {
  function setDraft(value: DeckDraft) {
    draft.value = value
  }

  function takeDraft(): DeckDraft | null {
    const value = draft.value
    draft.value = null
    return value
  }

  return { setDraft, takeDraft }
}
