export type ArticleStatus = 'draft' | 'published'

export interface Article {
  id: string
  slug: string
  title: string
  excerpt: string
  content: string
  cover_image_url: string | null
  status: ArticleStatus
  created_at: string
  published_at: string | null
}
