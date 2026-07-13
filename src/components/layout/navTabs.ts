import { Blocks, HouseIcon, Newspaper, WalletCards } from '@lucide/vue'
import type { RouteLocationNormalizedLoaded } from 'vue-router'

export interface NavTab {
  name: string
  label: string
  matchPrefix?: string
  icon?: typeof HouseIcon
}

export const navTabs: NavTab[] = [
  { name: 'home', label: 'Accueil', icon: HouseIcon },
  { name: 'sets', label: 'Sets', matchPrefix: '/sets', icon: Blocks },
  { name: 'deck-builder', label: 'Deck Builder', matchPrefix: '/decks', icon: WalletCards },
  { name: 'articles', label: 'Actus', matchPrefix: '/actus', icon: Newspaper },
]

export function isTabActive(route: RouteLocationNormalizedLoaded, tab: NavTab) {
  return tab.matchPrefix ? route.path.startsWith(tab.matchPrefix) : route.name === tab.name
}
