export interface PriceListing {
  id: string
  card_id: string
  source: string
  external_id: string
  title: string
  price_amount: number
  price_currency: string
  listing_url: string
  photo_url: string | null
  match_confidence: number
  scraped_at: string
  created_at: string
}
