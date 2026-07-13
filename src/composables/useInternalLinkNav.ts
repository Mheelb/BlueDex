import { useRouter } from 'vue-router'

/**
 * Intercepte les clics sur les liens internes (`<a href="/...">`) rendus dans du
 * contenu injecté via `v-html` (articles, descriptions…) pour naviguer via
 * vue-router plutôt que de recharger toute la page. Les liens externes, les
 * ancres, les clics avec modificateur (nouvel onglet…) et les `target="_blank"`
 * conservent leur comportement natif.
 *
 * Usage : `<div v-html="html" @click="onContentClick" />`
 */
export function useInternalLinkNav() {
  const router = useRouter()

  return function onContentClick(event: MouseEvent) {
    // Clic non-gauche ou avec modificateur (ouvrir dans un onglet…) : on ne touche à rien.
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return
    }

    const anchor = (event.target as HTMLElement | null)?.closest('a')
    const href = anchor?.getAttribute('href')
    // Uniquement les liens internes absolus (`/...`), pas les URLs protocole-relatives (`//...`).
    if (!href || !href.startsWith('/') || href.startsWith('//')) return
    if (anchor?.target && anchor.target !== '_self') return

    event.preventDefault()
    router.push(href)
  }
}
