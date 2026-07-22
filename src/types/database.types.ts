export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.5'
  }
  public: {
    Tables: {
      articles: {
        Row: {
          content: string
          cover_image_url: string | null
          created_at: string
          excerpt: string
          featured_cards: string[]
          id: string
          published_at: string | null
          slug: string
          status: string
          title: string
          topic_angle: string | null
        }
        Insert: {
          content: string
          cover_image_url?: string | null
          created_at?: string
          excerpt: string
          featured_cards?: string[]
          id?: string
          published_at?: string | null
          slug: string
          status?: string
          title: string
          topic_angle?: string | null
        }
        Update: {
          content?: string
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string
          featured_cards?: string[]
          id?: string
          published_at?: string | null
          slug?: string
          status?: string
          title?: string
          topic_angle?: string | null
        }
        Relationships: []
      }
      cards: {
        Row: {
          artist: string | null
          cost: number | null
          created_at: string
          effect: string | null
          faction: string | null
          id: string
          image_url: string | null
          is_full_art: boolean
          is_holo: boolean
          is_numbered: boolean
          is_overframe: boolean
          is_signed: boolean
          name: string
          number: string
          numbered_total: number | null
          power: number | null
          rarity: string
          set_id: string
          subtype: string | null
          support: number | null
          type: string | null
        }
        Insert: {
          artist?: string | null
          cost?: number | null
          created_at?: string
          effect?: string | null
          faction?: string | null
          id?: string
          image_url?: string | null
          is_full_art?: boolean
          is_holo?: boolean
          is_numbered?: boolean
          is_overframe?: boolean
          is_signed?: boolean
          name: string
          number: string
          numbered_total?: number | null
          power?: number | null
          rarity: string
          set_id: string
          subtype?: string | null
          support?: number | null
          type?: string | null
        }
        Update: {
          artist?: string | null
          cost?: number | null
          created_at?: string
          effect?: string | null
          faction?: string | null
          id?: string
          image_url?: string | null
          is_full_art?: boolean
          is_holo?: boolean
          is_numbered?: boolean
          is_overframe?: boolean
          is_signed?: boolean
          name?: string
          number?: string
          numbered_total?: number | null
          power?: number | null
          rarity?: string
          set_id?: string
          subtype?: string | null
          support?: number | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'cards_set_id_fkey'
            columns: ['set_id']
            isOneToOne: false
            referencedRelation: 'sets'
            referencedColumns: ['id']
          },
        ]
      }
      collection_cards: {
        Row: {
          card_id: string
          created_at: string
          quantity: number
          user_id: string
        }
        Insert: {
          card_id: string
          created_at?: string
          quantity?: number
          user_id: string
        }
        Update: {
          card_id?: string
          created_at?: string
          quantity?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'collection_cards_card_id_fkey'
            columns: ['card_id']
            isOneToOne: false
            referencedRelation: 'cards'
            referencedColumns: ['id']
          },
        ]
      }
      deck_bookmarks: {
        Row: {
          created_at: string
          deck_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deck_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          deck_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'deck_bookmarks_deck_id_fkey'
            columns: ['deck_id']
            isOneToOne: false
            referencedRelation: 'decks'
            referencedColumns: ['id']
          },
        ]
      }
      deck_cards: {
        Row: {
          card_id: string
          deck_id: string
          quantity: number
        }
        Insert: {
          card_id: string
          deck_id: string
          quantity: number
        }
        Update: {
          card_id?: string
          deck_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: 'deck_cards_card_id_fkey'
            columns: ['card_id']
            isOneToOne: false
            referencedRelation: 'cards'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'deck_cards_deck_id_fkey'
            columns: ['deck_id']
            isOneToOne: false
            referencedRelation: 'decks'
            referencedColumns: ['id']
          },
        ]
      }
      deck_stars: {
        Row: {
          created_at: string
          deck_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deck_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          deck_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'deck_stars_deck_id_fkey'
            columns: ['deck_id']
            isOneToOne: false
            referencedRelation: 'decks'
            referencedColumns: ['id']
          },
        ]
      }
      decks: {
        Row: {
          cover_card_id: string | null
          created_at: string
          format: string
          id: string
          is_public: boolean
          name: string
          star_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          cover_card_id?: string | null
          created_at?: string
          format: string
          id?: string
          is_public?: boolean
          name: string
          star_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          cover_card_id?: string | null
          created_at?: string
          format?: string
          id?: string
          is_public?: boolean
          name?: string
          star_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'decks_cover_card_id_fkey'
            columns: ['cover_card_id']
            isOneToOne: false
            referencedRelation: 'cards'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'decks_user_id_profiles_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      price_daily_snapshots: {
        Row: {
          card_id: string
          created_at: string
          currency: string
          id: string
          listing_count: number
          max_price: number
          median_price: number
          min_price: number
          snapshot_date: string
        }
        Insert: {
          card_id: string
          created_at?: string
          currency?: string
          id?: string
          listing_count: number
          max_price: number
          median_price: number
          min_price: number
          snapshot_date: string
        }
        Update: {
          card_id?: string
          created_at?: string
          currency?: string
          id?: string
          listing_count?: number
          max_price?: number
          median_price?: number
          min_price?: number
          snapshot_date?: string
        }
        Relationships: [
          {
            foreignKeyName: 'price_daily_snapshots_card_id_fkey'
            columns: ['card_id']
            isOneToOne: false
            referencedRelation: 'cards'
            referencedColumns: ['id']
          },
        ]
      }
      price_listings: {
        Row: {
          card_id: string
          created_at: string
          external_id: string
          id: string
          listing_url: string
          match_confidence: number
          photo_url: string | null
          price_amount: number
          price_currency: string
          scraped_at: string
          source: string
          title: string
        }
        Insert: {
          card_id: string
          created_at?: string
          external_id: string
          id?: string
          listing_url: string
          match_confidence: number
          photo_url?: string | null
          price_amount: number
          price_currency?: string
          scraped_at?: string
          source?: string
          title: string
        }
        Update: {
          card_id?: string
          created_at?: string
          external_id?: string
          id?: string
          listing_url?: string
          match_confidence?: number
          photo_url?: string | null
          price_amount?: number
          price_currency?: string
          scraped_at?: string
          source?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: 'price_listings_card_id_fkey'
            columns: ['card_id']
            isOneToOne: false
            referencedRelation: 'cards'
            referencedColumns: ['id']
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string
          id: string
          is_admin: boolean
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name: string
          id: string
          is_admin?: boolean
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          id?: string
          is_admin?: boolean
        }
        Relationships: []
      }
      sets: {
        Row: {
          card_count: number
          created_at: string
          id: string
          logo_url: string | null
          name: string
          release_date: string | null
          slug: string
          symbol_url: string | null
        }
        Insert: {
          card_count?: number
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          release_date?: string | null
          slug: string
          symbol_url?: string | null
        }
        Update: {
          card_count?: number
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          release_date?: string | null
          slug?: string
          symbol_url?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: { Args: never; Returns: boolean }
      save_deck: {
        Args: {
          p_cover_card_id: string
          p_deck_id: string
          p_entries: Json
          p_format: string
          p_is_public: boolean
          p_name: string
        }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    keyof (DefaultSchema['Tables'] & DefaultSchema['Views']) | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
