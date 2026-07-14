// Symboles de jeu utilisables dans le texte d'effet d'une carte (admin),
// remplacés par une image sur la page de détail.
// Écrire :cle: dans le texte d'effet -> remplacé par l'image correspondante.
// Pour ajouter un symbole : dépose le png dans public/symbols/ et ajoute une entrée ici.
export const CARD_SYMBOLS: Record<string, string> = {
  rotation: '/symbols/rotation.png',
  '0power': '/symbols/0power.svg',
  '1power': '/symbols/1power.svg',
  '0soutien': '/symbols/0soutien.svg',
  '1soutien': '/symbols/1soutien.svg',
}

export interface EffectTextPart {
  type: 'text' | 'symbol'
  value: string
}

const SYMBOL_PATTERN = /:([a-z0-9_-]+):/gi

export function parseCardEffect(text: string): EffectTextPart[] {
  const parts: EffectTextPart[] = []
  let lastIndex = 0

  for (const match of text.matchAll(SYMBOL_PATTERN)) {
    const key = match[1].toLowerCase()
    if (!(key in CARD_SYMBOLS)) continue

    if (match.index! > lastIndex) {
      parts.push({ type: 'text', value: text.slice(lastIndex, match.index) })
    }
    parts.push({ type: 'symbol', value: key })
    lastIndex = match.index! + match[0].length
  }

  if (lastIndex < text.length) {
    parts.push({ type: 'text', value: text.slice(lastIndex) })
  }

  return parts
}
