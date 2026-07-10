import { supabase } from '@/lib/supabase'
import type { Article } from '@/types/article'

export const articleKeys = {
  all: ['articles'] as const,
  published: (limit?: number) => [...articleKeys.all, 'published', limit ?? 'all'] as const,
  admin: () => [...articleKeys.all, 'admin'] as const,
  detail: (slug: string) => [...articleKeys.all, 'detail', slug] as const,
}

export async function fetchPublishedArticles(limit?: number): Promise<Article[]> {
  let query = supabase
    .from('articles')
    .select('*')
    .eq('status', 'published')
    .order('published_at', { ascending: false })

  if (limit) query = query.limit(limit)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data as Article[]
}

export async function fetchAdminArticles(): Promise<Article[]> {
  const { data, error } = await supabase.from('articles').select('*').order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data as Article[]
}

export async function fetchArticleBySlug(slug: string): Promise<Article> {
  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .single()

  if (error || !data) throw new Error(error?.message ?? 'Article introuvable.')
  return data as Article
}
