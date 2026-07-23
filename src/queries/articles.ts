import { supabase } from '@/lib/supabase'
import type { Article, ArticleStatus } from '@/types/article'
import type { TablesUpdate } from '@/types/database.types'

export const articleKeys = {
  all: ['articles'] as const,
  published: (limit?: number) => [...articleKeys.all, 'published', limit ?? 'all'] as const,
  admin: () => [...articleKeys.all, 'admin'] as const,
  detail: (slug: string) => [...articleKeys.all, 'detail', slug] as const,
}

const ARTICLE_LIST_COLUMNS = 'id,slug,title,excerpt,cover_image_url,status,created_at,published_at'

export async function fetchPublishedArticles(limit?: number): Promise<Article[]> {
  let query = supabase
    .from('articles')
    .select(ARTICLE_LIST_COLUMNS)
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

export async function updateArticle(id: string, input: TablesUpdate<'articles'>): Promise<void> {
  const { error } = await supabase.from('articles').update(input).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function setArticleStatus(id: string, status: ArticleStatus): Promise<void> {
  const { error } = await supabase
    .from('articles')
    .update({ status, published_at: status === 'published' ? new Date().toISOString() : null })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteArticle(id: string): Promise<void> {
  const { error } = await supabase.from('articles').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function generateArticle(payload: { subject: string; sources: string[] }): Promise<void> {
  const { error } = await supabase.functions.invoke('generate-article', { body: payload })
  if (error) throw new Error(error.message)
}
