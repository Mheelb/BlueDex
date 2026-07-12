import { useHead, useSeoMeta } from '@unhead/vue'
import { toValue, type MaybeRefOrGetter } from 'vue'

/**
 * URL absolue du site en production. Sert de base aux URLs canoniques,
 * Open Graph et au sitemap. Surchargeable via `VITE_SITE_URL`.
 */
export const SITE_URL = (import.meta.env.VITE_SITE_URL || 'https://bluedex.fr').replace(/\/$/, '')

export const SITE_NAME = 'BlueDex'

export const DEFAULT_DESCRIPTION =
  'BlueDex, la base de données communautaire du jeu de cartes à collectionner Blue Rising : parcours les sets, filtre les cartes et prépare tes decks.'

/** Image utilisée pour les aperçus de partage quand la page n'en fournit pas. */
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-default.png`

/** Construit une URL absolue à partir d'un chemin relatif (`/actus/...`). */
export function absoluteUrl(path: string): string {
  if (!path) return SITE_URL
  if (/^https?:\/\//.test(path)) return path
  return `${SITE_URL}${path.startsWith('/') ? '' : '/'}${path}`
}

export interface PageSeo {
  /** Titre de la page (sans le suffixe " · BlueDex", ajouté automatiquement). */
  title?: MaybeRefOrGetter<string | undefined>
  description?: MaybeRefOrGetter<string | undefined>
  /** Chemin canonique, ex. `/actus/mon-article`. */
  path?: MaybeRefOrGetter<string | undefined>
  /** Image d'aperçu (URL absolue de préférence). */
  image?: MaybeRefOrGetter<string | undefined>
  /** `website` (défaut) ou `article`. */
  type?: MaybeRefOrGetter<'website' | 'article' | undefined>
}

/**
 * Applique les métadonnées SEO d'une page : title, description, canonical,
 * Open Graph et Twitter Card. Réactif : passe des refs/getters pour du contenu
 * chargé de façon asynchrone.
 */
export function usePageSeo(seo: PageSeo = {}) {
  const canonical = () => (seo.path ? absoluteUrl(toValue(seo.path) ?? '') : SITE_URL)

  useHead({
    link: [{ rel: 'canonical', href: canonical }],
  })

  useSeoMeta({
    title: () => toValue(seo.title),
    titleTemplate: (title) => (title ? `${title} · ${SITE_NAME}` : SITE_NAME),
    description: () => toValue(seo.description) ?? DEFAULT_DESCRIPTION,
    ogTitle: () => toValue(seo.title) ?? SITE_NAME,
    ogDescription: () => toValue(seo.description) ?? DEFAULT_DESCRIPTION,
    ogType: () => toValue(seo.type) ?? 'website',
    ogSiteName: SITE_NAME,
    ogUrl: canonical,
    ogImage: () => toValue(seo.image) ?? DEFAULT_OG_IMAGE,
    ogLocale: 'fr_FR',
    twitterCard: 'summary_large_image',
    twitterTitle: () => toValue(seo.title) ?? SITE_NAME,
    twitterDescription: () => toValue(seo.description) ?? DEFAULT_DESCRIPTION,
    twitterImage: () => toValue(seo.image) ?? DEFAULT_OG_IMAGE,
  })
}

/**
 * Injecte un bloc JSON-LD schema.org. `data` peut être un getter pour rester
 * réactif au contenu asynchrone.
 */
export function useJsonLd(data: MaybeRefOrGetter<Record<string, unknown> | null | undefined>) {
  useHead({
    script: [
      {
        type: 'application/ld+json',
        innerHTML: () => {
          const value = toValue(data)
          return value ? JSON.stringify(value) : ''
        },
      },
    ],
  })
}
