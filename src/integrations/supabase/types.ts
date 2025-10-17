
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      activity_feed: {
        Row: {
          actor_id: string
          created_at: string
          data: Json | null
          entity_id: string
          entity_type: string
          id: string
          type: string
          user_id: string
        }
        Insert: {
          actor_id: string
          created_at?: string
          data?: Json | null
          entity_id: string
          entity_type: string
          id?: string
          type: string
          user_id: string
        }
        Update: {
          actor_id?: string
          created_at?: string
          data?: Json | null
          entity_id?: string
          entity_type?: string
          id?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      analytics_events: {
        Row: {
          created_at: string | null
          event_name: string
          id: string
          properties: Json | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_name: string
          id?: string
          properties?: Json | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_name?: string
          id?: string
          properties?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      announcements: {
        Row: {
          created_at: string
          ends_at: string | null
          id: string
          is_live: boolean | null
          starts_at: string | null
          text: string
        }
        Insert: {
          created_at?: string
          ends_at?: string | null
          id?: string
          is_live?: boolean | null
          starts_at?: string | null
          text: string
        }
        Update: {
          created_at?: string
          ends_at?: string | null
          id?: string
          is_live?: boolean | null
          starts_at?: string | null
          text?: string
        }
        Relationships: []
      }
      api_tokens: {
        Row: {
          created_at: string
          id: string
          label: string
          last_used_at: string | null
          rate_limit_per_min: number | null
          revoked: boolean | null
          scopes: string[] | null
          token_hash: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          last_used_at?: string | null
          rate_limit_per_min?: number | null
          revoked?: boolean | null
          scopes?: string[] | null
          token_hash: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          last_used_at?: string | null
          rate_limit_per_min?: number | null
          revoked?: boolean | null
          scopes?: string[] | null
          token_hash?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      approved_directory_profiles: {
        Row: {
          bio: string
          created_at: string
          credits: string[] | null
          experience: string | null
          genres: string[] | null
          hourly_rate: string | null
          id: string
          location: string | null
          rating: number | null
          reviews_count: number | null
          social_links: Json | null
          submission_id: string
          title: string
          updated_at: string
          user_id: string
          verified: boolean | null
          website_url: string | null
        }
        Insert: {
          bio: string
          created_at?: string
          credits?: string[] | null
          experience?: string | null
          genres?: string[] | null
          hourly_rate?: string | null
          id?: string
          location?: string | null
          rating?: number | null
          reviews_count?: number | null
          social_links?: Json | null
          submission_id: string
          title: string
          updated_at?: string
          user_id: string
          verified?: boolean | null
          website_url?: string | null
        }
        Update: {
          bio?: string
          created_at?: string
          credits?: string[] | null
          experience?: string | null
          genres?: string[] | null
          hourly_rate?: string | null
          id?: string
          location?: string | null
          rating?: number | null
          reviews_count?: number | null
          social_links?: Json | null
          submission_id?: string
          title?: string
          updated_at?: string
          user_id?: string
          verified?: boolean | null
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "approved_directory_profiles_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "directory_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approved_directory_profiles_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "approved_directory_profiles_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "view_hub_creator_spotlight"
            referencedColumns: ["id"]
          },
        ]
      }
      artist_analytics: {
        Row: {
          artist_id: string
          artist_name: string
          created_at: string
          id: string
          platform: string
          updated_at: string
          user_id: string
        }
        Insert: {
          artist_id: string
          artist_name: string
          created_at?: string
          id?: string
          platform: string
          updated_at?: string
          user_id: string
        }
        Update: {
          artist_id?: string
          artist_name?: string
          created_at?: string
          id?: string
          platform?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      artist_tips: {
        Row: {
          amount: number
          artist_id: string | null
          created_at: string
          fan_id: string | null
          id: string
          message: string | null
          paid_at: string | null
          release_id: string | null
          purchaser_id: string | null
          status: string | null
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
        }
        Insert: {
          amount: number
          artist_id?: string | null
          created_at?: string
          fan_id?: string | null
          id?: string
          message?: string | null
          paid_at?: string | null
          release_id?: string | null
          purchaser_id?: string | null
          status?: string | null
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
        }
        Update: {
          amount?: number
          artist_id?: string | null
          created_at?: string
          fan_id?: string | null
          id?: string
          message?: string | null
          paid_at?: string | null
          release_id?: string | null
          purchaser_id?: string | null
          status?: string | null
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "artist_tips_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "releases"
            referencedColumns: ["id"]
          },
        ]
      }
      artists: {
        Row: {
          apple_music_url: string | null
          bio: string | null
          created_at: string
          id: string
          image_url: string | null
          instagram_url: string | null
          is_featured: boolean | null
          name: string
          soundcloud_url: string | null
          spotify_url: string | null
          twitter_url: string | null
          updated_at: string
          website_url: string | null
          youtube_url: string | null
        }
        Insert: {
          apple_music_url?: string | null
          bio?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          instagram_url?: string | null
          is_featured?: boolean | null
          name: string
          soundcloud_url?: string | null
          spotify_url?: string | null
          twitter_url?: string | null
          updated_at?: string
          website_url?: string | null
          youtube_url?: string | null
        }
        Update: {
          apple_music_url?: string | null
          bio?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          instagram_url?: string | null
          is_featured?: boolean | null
          name?: string
          soundcloud_url?: string | null
          spotify_url?: string | null
          twitter_url?: string | null
          updated_at?: string
          website_url?: string | null
          youtube_url?: string | null
        }
        Relationships: []
      }
      audience_analytics: {
        Row: {
          age_range: string | null
          artist_analytics_id: string
          city: string | null
          country: string | null
          created_at: string
          date_recorded: string
          gender: string | null
          id: string
          listener_count: number | null
          percentage: number | null
          platform: string
        }
        Insert: {
          age_range?: string | null
          artist_analytics_id: string
          city?: string | null
          country?: string | null
          created_at?: string
          date_recorded?: string
          gender?: string | null
          id?: string
          listener_count?: number | null
          percentage?: number | null
          platform: string
        }
        Update: {
          age_range?: string | null
          artist_analytics_id?: string
          city?: string | null
          country?: string | null
          created_at?: string
          date_recorded?: string
          gender?: string | null
          id?: string
          listener_count?: number | null
          percentage?: number | null
          platform?: string
        }
        Relationships: [
          {
            foreignKeyName: "audience_analytics_artist_analytics_id_fkey"
            columns: ["artist_analytics_id"]
            isOneToOne: false
            referencedRelation: "artist_analytics"
            referencedColumns: ["id"]
          },
        ]
      }
      audio_files: {
        Row: {
          bit_rate: number | null
          created_at: string
          duration_seconds: number | null
          file_name: string
          file_size: number
          file_type: string
          id: string
          processing_status: string | null
          sample_rate: number | null
          storage_path: string
          stream_url: string | null
          updated_at: string
          upload_session_id: string | null
          user_id: string
          waveform_data: Json | null
        }
        Insert: {
          bit_rate?: number | null
          created_at?: string
          duration_seconds?: number | null
          file_name: string
          file_size: number
          file_type: string
          id?: string
          processing_status?: string | null
          sample_rate?: number | null
          storage_path: string
          stream_url?: string | null
          updated_at?: string
          upload_session_id?: string | null
          user_id: string
          waveform_data?: Json | null
        }
        Update: {
          bit_rate?: number | null
          created_at?: string
          duration_seconds?: number | null
          file_name?: string
          file_size?: number
          file_type?: string
          id?: string
          processing_status?: string | null
          sample_rate?: number | null
          storage_path?: string
          stream_url?: string | null
          updated_at?: string
          upload_session_id?: string | null
          user_id?: string
          waveform_data?: Json | null
        }
        Relationships: []
      }
      automations: {
        Row: {
          automation_type: string
          config_json: Json | null
          created_at: string | null
          creator_id: string
          id: string
          is_enabled: boolean | null
          next_run_at: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          automation_type: string
          config_json?: Json | null
          created_at?: string | null
          creator_id: string
          id?: string
          is_enabled?: boolean | null
          next_run_at?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          automation_type?: string
          config_json?: Json | null
          created_at?: string | null
          creator_id?: string
          id?: string
          is_enabled?: boolean | null
          next_run_at?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      badge_definitions: {
        Row: {
          badge_type: string
          created_at: string
          description: string
          icon_url: string | null
          id: string
          is_active: boolean | null
          name: string
          required_action: string | null
          required_count: number | null
          required_points: number | null
          tier: string | null
        }
        Insert: {
          badge_type: string
          created_at?: string
          description: string
          icon_url?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          required_action?: string | null
          required_count?: number | null
          required_points?: number | null
          tier?: string | null
        }
        Update: {
          badge_type?: string
          created_at?: string
          description?: string
          icon_url?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          required_action?: string | null
          required_count?: number | null
          required_points?: number | null
          tier?: string | null
        }
        Relationships: []
      }
      battle_entries: {
        Row: {
          audio_path: string
          battle_id: string
          created_at: string | null
          id: string
          title: string
          user_id: string
        }
        Insert: {
          audio_path: string
          battle_id: string
          created_at?: string | null
          id?: string
          title: string
          user_id: string
        }
        Update: {
          audio_path?: string
          battle_id?: string
          created_at?: string | null
          id?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "battle_entries_battle_id_fkey"
            columns: ["battle_id"]
            isOneToOne: false
            referencedRelation: "battles"
            referencedColumns: ["id"]
          },
        ]
      }
      battle_matchups: {
        Row: {
          battle_id: string
          created_at: string | null
          entry_a_id: string
          entry_b_id: string
          id: string
          round_number: number
          winner_entry_id: string | null
        }
        Insert: {
          battle_id: string
          created_at?: string | null
          entry_a_id: string
          entry_b_id: string
          id?: string
          round_number: number
          winner_entry_id?: string | null
        }
        Update: {
          battle_id?: string
          created_at?: string | null
          entry_a_id?: string
          entry_b_id?: string
          id?: string
          round_number?: number
          winner_entry_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "battle_matchups_battle_id_fkey"
            columns: ["battle_id"]
            isOneToOne: false
            referencedRelation: "battles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "battle_matchups_entry_a_id_fkey"
            columns: ["entry_a_id"]
            isOneToOne: false
            referencedRelation: "battle_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "battle_matchups_entry_b_id_fkey"
            columns: ["entry_b_id"]
            isOneToOne: false
            referencedRelation: "battle_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "battle_matchups_winner_entry_id_fkey"
            columns: ["winner_entry_id"]
            isOneToOne: false
            referencedRelation: "battle_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      battle_rounds: {
        Row: {
          battle_id: string
          created_at: string | null
          ends_at: string
          id: string
          round_number: number
          starts_at: string
        }
        Insert: {
          battle_id: string
          created_at?: string | null
          ends_at: string
          id?: string
          round_number: number
          starts_at: string
        }
        Update: {
          battle_id?: string
          created_at?: string | null
          ends_at?: string
          id?: string
          round_number?: number
          starts_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "battle_rounds_battle_id_fkey"
            columns: ["battle_id"]
            isOneToOne: false
            referencedRelation: "battles"
            referencedColumns: ["id"]
          },
        ]
      }
      battle_transactions: {
        Row: {
          amount_cents: number
          battle_id: string
          created_at: string
          id: string
          stripe_payment_intent_id: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          user_id: string
        }
        Insert: {
          amount_cents: number
          battle_id: string
          created_at?: string
          id?: string
          stripe_payment_intent_id?: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          user_id: string
        }
        Update: {
          amount_cents?: number
          battle_id?: string
          created_at?: string
          id?: string
          stripe_payment_intent_id?: string | null
          type?: Database["public"]["Enums"]["transaction_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "battle_transactions_battle_id_fkey"
            columns: ["battle_id"]
            isOneToOne: false
            referencedRelation: "battles"
            referencedColumns: ["id"]
          },
        ]
      }
      battle_votes: {
        Row: {
          battle_id: string
          created_at: string | null
          entry_id: string
          id: string
          matchup_id: string
          voter_user_id: string
        }
        Insert: {
          battle_id: string
          created_at?: string | null
          entry_id: string
          id?: string
          matchup_id: string
          voter_user_id: string
        }
        Update: {
          battle_id?: string
          created_at?: string | null
          entry_id?: string
          id?: string
          matchup_id?: string
          voter_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "battle_votes_battle_id_fkey"
            columns: ["battle_id"]
            isOneToOne: false
            referencedRelation: "battles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "battle_votes_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "battle_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "battle_votes_matchup_id_fkey"
            columns: ["matchup_id"]
            isOneToOne: false
            referencedRelation: "battle_matchups"
            referencedColumns: ["id"]
          },
        ]
      }
      battles: {
        Row: {
          created_at: string | null
          created_by: string
          ends_at: string
          entry_fee_cents: number | null
          id: string
          is_featured: boolean | null
          prize_pool_cents: number | null
          starts_at: string
          status: string
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          ends_at: string
          entry_fee_cents?: number | null
          id?: string
          is_featured?: boolean | null
          prize_pool_cents?: number | null
          starts_at: string
          status?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          ends_at?: string
          entry_fee_cents?: number | null
          id?: string
          is_featured?: boolean | null
          prize_pool_cents?: number | null
          starts_at?: string
          status?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      beat_collaborators: {
        Row: {
          beat_id: string
          collaborator_email: string | null
          collaborator_name: string
          collaborator_user_id: string | null
          content_id_percentage: number
          created_at: string
          id: string
          is_confirmed: boolean | null
          profit_share_percentage: number
          publishing_share_percentage: number
          role: string
          updated_at: string
        }
        Insert: {
          beat_id: string
          collaborator_email?: string | null
          collaborator_name: string
          collaborator_user_id?: string | null
          content_id_percentage?: number
          created_at?: string
          id?: string
          is_confirmed?: boolean | null
          profit_share_percentage?: number
          publishing_share_percentage?: number
          role?: string
          updated_at?: string
        }
        Update: {
          beat_id?: string
          collaborator_email?: string | null
          collaborator_name?: string
          collaborator_user_id?: string | null
          content_id_percentage?: number
          created_at?: string
          id?: string
          is_confirmed?: boolean | null
          profit_share_percentage?: number
          publishing_share_percentage?: number
          role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "beat_collaborators_beat_id_fkey"
            columns: ["beat_id"]
            isOneToOne: false
            referencedRelation: "beats"
            referencedColumns: ["id"]
          },
        ]
      }
      beat_licenses: {
        Row: {
          beat_id: string
          created_at: string
          id: string
          is_active: boolean | null
          license_template_id: string
          price_override: number | null
        }
        Insert: {
          beat_id: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          license_template_id: string
          price_override?: number | null
        }
        Update: {
          beat_id?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          license_template_id?: string
          price_override?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "beat_licenses_beat_id_fkey"
            columns: ["beat_id"]
            isOneToOne: false
            referencedRelation: "beats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beat_licenses_license_template_id_fkey"
            columns: ["license_template_id"]
            isOneToOne: false
            referencedRelation: "license_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      beat_sales: {
        Row: {
          beat_id: string | null
          buyer_id: string | null
          commission_rate: number
          created_at: string
          currency: string
          id: string
          license_type: string
          payout_id: string | null
          payout_status: string
          platform_fee: number
          producer_earnings: number
          producer_id: string
          sale_price: number
          updated_at: string
        }
        Insert: {
          beat_id?: string | null
          buyer_id?: string | null
          commission_rate?: number
          created_at?: string
          currency?: string
          id?: string
          license_type?: string
          payout_id?: string | null
          payout_status?: string
          platform_fee: number
          producer_earnings: number
          producer_id: string
          sale_price: number
          updated_at?: string
        }
        Update: {
          beat_id?: string | null
          buyer_id?: string | null
          commission_rate?: number
          created_at?: string
          currency?: string
          id?: string
          license_type?: string
          payout_id?: string | null
          payout_status?: string
          platform_fee?: number
          producer_earnings?: number
          producer_id?: string
          sale_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "beat_sales_beat_id_fkey"
            columns: ["beat_id"]
            isOneToOne: false
            referencedRelation: "beats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beat_sales_payout_id_fkey"
            columns: ["payout_id"]
            isOneToOne: false
            referencedRelation: "payout_records"
            referencedColumns: ["id"]
          },
        ]
      }
      beats: {
        Row: {
          audio_url: string | null
          available_licenses: Json | null
          bpm: number | null
          created_at: string
          description: string | null
          genre: string | null
          id: string
          image_url: string | null
          instruments: string[] | null
          is_featured: boolean
          is_published: boolean
          key: string | null
          license_prices: Json | null
          license_types: Json | null
          moods: string[] | null
          owner_id: string | null
          owner_type: string | null
          price: number
          producer_name: string | null
          stems_required: boolean | null
          stems_url: string | null
          tagged_url: string | null
          tags: string[] | null
          title: string
          updated_at: string
          uploaded_by_admin: boolean
          user_id: string
        }
        Insert: {
          audio_url?: string | null
          available_licenses?: Json | null
          bpm?: number | null
          created_at?: string
          description?: string | null
          genre?: string | null
          id?: string
          image_url?: string | null
          instruments?: string[] | null
          is_featured?: boolean
          is_published?: boolean
          key?: string | null
          license_prices?: Json | null
          license_types?: Json | null
          moods?: string[] | null
          owner_id?: string | null
          owner_type?: string | null
          price?: number
          producer_name?: string | null
          stems_required?: boolean | null
          stems_url?: string | null
          tagged_url?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
          uploaded_by_admin?: boolean
          user_id: string
        }
        Update: {
          audio_url?: string | null
          available_licenses?: Json | null
          bpm?: number | null
          created_at?: string
          description?: string | null
          genre?: string | null
          id?: string
          image_url?: string | null
          instruments?: string[] | null
          is_featured?: boolean
          is_published?: boolean
          key?: string | null
          license_prices?: Json | null
          license_types?: Json | null
          moods?: string[] | null
          owner_id?: string | null
          owner_type?: string | null
          price?: number
          producer_name?: string | null
          stems_required?: boolean | null
          stems_url?: string | null
          tagged_url?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          uploaded_by_admin?: boolean
          user_id?: string
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          content: string | null
          created_at: string
          created_by: string
          excerpt: string | null
          featured_image_url: string | null
          html_content: string | null
          id: string
          is_published: boolean
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          created_by: string
          excerpt?: string | null
          featured_image_url?: string | null
          html_content?: string | null
          id?: string
          is_published?: boolean
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          created_by?: string
          excerpt?: string | null
          featured_image_url?: string | null
          html_content?: string | null
          id?: string
          is_published?: boolean
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      bookings: {
        Row: {
          budget_range: string | null
          client_email: string
          client_name: string
          client_phone: string | null
          client_user_id: string
          created_at: string
          deadline: string | null
          id: string
          message: string | null
          preferred_contact: string
          professional_user_id: string
          project_description: string
          project_title: string
          service_type: string
          status: string
          updated_at: string
        }
        Insert: {
          budget_range?: string | null
          client_email: string
          client_name: string
          client_phone?: string | null
          client_user_id: string
          created_at?: string
          deadline?: string | null
          id?: string
          message?: string | null
          preferred_contact: string
          professional_user_id: string
          project_description: string
          project_title: string
          service_type: string
          status?: string
          updated_at?: string
        }
        Update: {
          budget_range?: string | null
          client_email?: string
          client_name?: string
          client_phone?: string | null
          client_user_id?: string
          created_at?: string
          deadline?: string | null
          id?: string
          message?: string | null
          preferred_contact?: string
          professional_user_id?: string
          project_description?: string
          project_title?: string
          service_type?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_client_user_id_fkey"
            columns: ["client_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "bookings_client_user_id_fkey"
            columns: ["client_user_id"]
            isOneToOne: false
            referencedRelation: "view_hub_creator_spotlight"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_professional_user_id_fkey"
            columns: ["professional_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "bookings_professional_user_id_fkey"
            columns: ["professional_user_id"]
            isOneToOne: false
            referencedRelation: "view_hub_creator_spotlight"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_rewards: {
        Row: {
          campaign_id: string
          contribution_amount_cents: number
          created_at: string
          description: string | null
          estimated_delivery: string | null
          id: string
          metadata: Json | null
          quantity_claimed: number
          quantity_limit: number | null
          title: string
          updated_at: string
        }
        Insert: {
          campaign_id: string
          contribution_amount_cents: number
          created_at?: string
          description?: string | null
          estimated_delivery?: string | null
          id?: string
          metadata?: Json | null
          quantity_claimed?: number
          quantity_limit?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          campaign_id?: string
          contribution_amount_cents?: number
          created_at?: string
          description?: string | null
          estimated_delivery?: string | null
          id?: string
          metadata?: Json | null
          quantity_claimed?: number
          quantity_limit?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_rewards_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_status_history: {
        Row: {
          campaign_id: string
          changed_by: string | null
          created_at: string
          from_status: Database['public']['Enums']['campaign_status'] | null
          id: string
          note: string | null
          to_status: Database['public']['Enums']['campaign_status']
        }
        Insert: {
          campaign_id: string
          changed_by?: string | null
          created_at?: string
          from_status?: Database['public']['Enums']['campaign_status'] | null
          id?: string
          note?: string | null
          to_status: Database['public']['Enums']['campaign_status']
        }
        Update: {
          campaign_id?: string
          changed_by?: string | null
          created_at?: string
          from_status?: Database['public']['Enums']['campaign_status'] | null
          id?: string
          note?: string | null
          to_status?: Database['public']['Enums']['campaign_status']
        }
        Relationships: [
          {
            foreignKeyName: "campaign_status_history_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_supporters: {
        Row: {
          campaign_id: string
          contribution_amount_cents: number
          contributed_at: string
          id: string
          metadata: Json | null
          refunded_at: string | null
          reward_id: string | null
          status: Database['public']['Enums']['campaign_supporter_status']
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          supporter_id: string | null
          fulfilled_at: string | null
        }
        Insert: {
          campaign_id: string
          contribution_amount_cents: number
          contributed_at?: string
          id?: string
          metadata?: Json | null
          refunded_at?: string | null
          reward_id?: string | null
          status?: Database['public']['Enums']['campaign_supporter_status']
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          supporter_id?: string | null
          fulfilled_at?: string | null
        }
        Update: {
          campaign_id?: string
          contribution_amount_cents?: number
          contributed_at?: string
          id?: string
          metadata?: Json | null
          refunded_at?: string | null
          reward_id?: string | null
          status?: Database['public']['Enums']['campaign_supporter_status']
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          supporter_id?: string | null
          fulfilled_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_supporters_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_supporters_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "campaign_rewards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_supporters_supporter_id_fkey"
            columns: ["supporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "campaign_supporters_supporter_id_fkey"
            columns: ["supporter_id"]
            isOneToOne: false
            referencedRelation: "view_hub_creator_spotlight"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          created_at: string
          creator_id: string
          current_amount_cents: number
          description: string | null
          funding_deadline: string | null
          goal_amount_cents: number
          id: string
          metadata: Json | null
          published_at: string | null
          slug: string | null
          status: Database['public']['Enums']['campaign_status']
          supporter_count: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          current_amount_cents?: number
          description?: string | null
          funding_deadline?: string | null
          goal_amount_cents: number
          id?: string
          metadata?: Json | null
          published_at?: string | null
          slug?: string | null
          status?: Database['public']['Enums']['campaign_status']
          supporter_count?: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          current_amount_cents?: number
          description?: string | null
          funding_deadline?: string | null
          goal_amount_cents?: number
          id?: string
          metadata?: Json | null
          published_at?: string | null
          slug?: string | null
          status?: Database['public']['Enums']['campaign_status']
          supporter_count?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "campaigns_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "view_hub_creator_spotlight"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_submissions: {
        Row: {
          beat_id: string | null
          challenge_id: string
          created_at: string
          id: string
          submission_description: string | null
          submission_title: string
          submission_url: string | null
          user_id: string
          votes_count: number
        }
        Insert: {
          beat_id?: string | null
          challenge_id: string
          created_at?: string
          id?: string
          submission_description?: string | null
          submission_title: string
          submission_url?: string | null
          user_id: string
          votes_count?: number
        }
        Update: {
          beat_id?: string | null
          challenge_id?: string
          created_at?: string
          id?: string
          submission_description?: string | null
          submission_title?: string
          submission_url?: string | null
          user_id?: string
          votes_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "challenge_submissions_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "monthly_challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_votes: {
        Row: {
          challenge_id: string
          created_at: string
          id: string
          submission_id: string
          voter_id: string
        }
        Insert: {
          challenge_id: string
          created_at?: string
          id?: string
          submission_id: string
          voter_id: string
        }
        Update: {
          challenge_id?: string
          created_at?: string
          id?: string
          submission_id?: string
          voter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_votes_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "monthly_challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_votes_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "challenge_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      collaboration_projects: {
        Row: {
          budget_range: string | null
          created_at: string
          deadline: string | null
          description: string
          genre: string
          id: string
          is_featured: boolean | null
          project_type: string | null
          requirements: string | null
          skills_needed: string[]
          status: string
          title: string
          updated_at: string
          user_id: string
          votes: number
        }
        Insert: {
          budget_range?: string | null
          created_at?: string
          deadline?: string | null
          description: string
          genre: string
          id?: string
          is_featured?: boolean | null
          project_type?: string | null
          requirements?: string | null
          skills_needed?: string[]
          status?: string
          title: string
          updated_at?: string
          user_id: string
          votes?: number
        }
        Update: {
          budget_range?: string | null
          created_at?: string
          deadline?: string | null
          description?: string
          genre?: string
          id?: string
          is_featured?: boolean | null
          project_type?: string | null
          requirements?: string | null
          skills_needed?: string[]
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
          votes?: number
        }
        Relationships: []
      }
      collaborators: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          is_external: boolean | null
          name: string
          release_id: string | null
          role: string
          role_description: string | null
          track_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          is_external?: boolean | null
          name: string
          release_id?: string | null
          role: string
          role_description?: string | null
          track_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          is_external?: boolean | null
          name?: string
          release_id?: string | null
          role?: string
          role_description?: string | null
          track_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "collaborators_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "releases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collaborators_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          content: string
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "view_hub_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_bids: {
        Row: {
          bid_amount_cents: number
          commission_request_id: string | null
          created_at: string
          estimated_delivery_days: number | null
          id: string
          portfolio_samples: string[] | null
          producer_id: string
          proposal_message: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          bid_amount_cents: number
          commission_request_id?: string | null
          created_at?: string
          estimated_delivery_days?: number | null
          id?: string
          portfolio_samples?: string[] | null
          producer_id: string
          proposal_message?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          bid_amount_cents?: number
          commission_request_id?: string | null
          created_at?: string
          estimated_delivery_days?: number | null
          id?: string
          portfolio_samples?: string[] | null
          producer_id?: string
          proposal_message?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commission_bids_commission_request_id_fkey"
            columns: ["commission_request_id"]
            isOneToOne: false
            referencedRelation: "commission_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_messages: {
        Row: {
          commission_id: string
          content: string
          created_at: string
          id: string
          sender_id: string
        }
        Insert: {
          commission_id: string
          content: string
          created_at?: string
          id?: string
          sender_id: string
        }
        Update: {
          commission_id?: string
          content?: string
          created_at?: string
          id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "commission_messages_commission_id_fkey"
            columns: ["commission_id"]
            isOneToOne: false
            referencedRelation: "commission_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_requests: {
        Row: {
          application_fee_percent: number | null
          budget_cents: number
          created_at: string
          deadline: string | null
          description: string | null
          genre: string | null
          id: string
          producer_id: string
          reference_links: string[] | null
          requester_id: string
          status: string
          stripe_payment_intent_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          application_fee_percent?: number | null
          budget_cents: number
          created_at?: string
          deadline?: string | null
          description?: string | null
          genre?: string | null
          id?: string
          producer_id: string
          reference_links?: string[] | null
          requester_id: string
          status?: string
          stripe_payment_intent_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          application_fee_percent?: number | null
          budget_cents?: number
          created_at?: string
          deadline?: string | null
          description?: string | null
          genre?: string | null
          id?: string
          producer_id?: string
          reference_links?: string[] | null
          requester_id?: string
          status?: string
          stripe_payment_intent_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      community_comments: {
        Row: {
          body: string
          created_at: string
          id: string
          post_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          post_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          post_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_posts: {
        Row: {
          body: string
          created_at: string
          creator_id: string
          id: string
          media_path: string | null
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          creator_id: string
          id?: string
          media_path?: string | null
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          creator_id?: string
          id?: string
          media_path?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          subject: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          subject?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          subject?: string | null
        }
        Relationships: []
      }
      contact_rate_limits: {
        Row: {
          email: string
          first_submission_at: string
          id: string
          ip_address: unknown
          last_submission_at: string
          submission_count: number
        }
        Insert: {
          email: string
          first_submission_at?: string
          id?: string
          ip_address: unknown
          last_submission_at?: string
          submission_count?: number
        }
        Update: {
          email?: string
          first_submission_at?: string
          id?: string
          ip_address?: unknown
          last_submission_at?: string
          submission_count?: number
        }
        Relationships: []
      }
      content_reports: {
        Row: {
          created_at: string
          description: string | null
          id: string
          reason: string
          reporter_id: string
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          target_id: string
          target_type: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          reason: string
          reporter_id: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          target_id: string
          target_type: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          reason?: string
          reporter_id?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          target_id?: string
          target_type?: string
        }
        Relationships: []
      }
      content_splits: {
        Row: {
          content_id: string
          content_type: string
          created_at: string
          id: string
          payee_user_id: string
          percent: number
          updated_at: string
        }
        Insert: {
          content_id: string
          content_type: string
          created_at?: string
          id?: string
          payee_user_id: string
          percent: number
          updated_at?: string
        }
        Update: {
          content_id?: string
          content_type?: string
          created_at?: string
          id?: string
          payee_user_id?: string
          percent?: number
          updated_at?: string
        }
        Relationships: []
      }
      contest_files: {
        Row: {
          contest_id: string
          created_at: string
          description: string | null
          display_order: number | null
          file_name: string
          file_size: number | null
          file_type: string
          file_url: string
          id: string
          is_downloadable: boolean | null
          updated_at: string
        }
        Insert: {
          contest_id: string
          created_at?: string
          description?: string | null
          display_order?: number | null
          file_name: string
          file_size?: number | null
          file_type: string
          file_url: string
          id?: string
          is_downloadable?: boolean | null
          updated_at?: string
        }
        Update: {
          contest_id?: string
          created_at?: string
          description?: string | null
          display_order?: number | null
          file_name?: string
          file_size?: number | null
          file_type?: string
          file_url?: string
          id?: string
          is_downloadable?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contest_files_contest_id_fkey"
            columns: ["contest_id"]
            isOneToOne: false
            referencedRelation: "contests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contest_files_contest_id_fkey"
            columns: ["contest_id"]
            isOneToOne: false
            referencedRelation: "view_hub_contests"
            referencedColumns: ["id"]
          },
        ]
      }
      contest_reminders: {
        Row: {
          contest_id: string
          created_at: string
          id: string
          reminded_at: string | null
          user_id: string
        }
        Insert: {
          contest_id: string
          created_at?: string
          id?: string
          reminded_at?: string | null
          user_id: string
        }
        Update: {
          contest_id?: string
          created_at?: string
          id?: string
          reminded_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      contest_submissions: {
        Row: {
          beat_id: string
          contest_id: string
          id: string
          rank: number | null
          submission_description: string | null
          submission_title: string | null
          submitted_at: string
          user_id: string
          votes_count: number | null
        }
        Insert: {
          beat_id: string
          contest_id: string
          id?: string
          rank?: number | null
          submission_description?: string | null
          submission_title?: string | null
          submitted_at?: string
          user_id: string
          votes_count?: number | null
        }
        Update: {
          beat_id?: string
          contest_id?: string
          id?: string
          rank?: number | null
          submission_description?: string | null
          submission_title?: string | null
          submitted_at?: string
          user_id?: string
          votes_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contest_submissions_beat_id_fkey"
            columns: ["beat_id"]
            isOneToOne: false
            referencedRelation: "beats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contest_submissions_contest_id_fkey"
            columns: ["contest_id"]
            isOneToOne: false
            referencedRelation: "contests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contest_submissions_contest_id_fkey"
            columns: ["contest_id"]
            isOneToOne: false
            referencedRelation: "view_hub_contests"
            referencedColumns: ["id"]
          },
        ]
      }
      contest_votes: {
        Row: {
          contest_id: string
          created_at: string
          id: string
          submission_id: string
          voter_id: string
        }
        Insert: {
          contest_id: string
          created_at?: string
          id?: string
          submission_id: string
          voter_id: string
        }
        Update: {
          contest_id?: string
          created_at?: string
          id?: string
          submission_id?: string
          voter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contest_votes_contest_id_fkey"
            columns: ["contest_id"]
            isOneToOne: false
            referencedRelation: "contests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contest_votes_contest_id_fkey"
            columns: ["contest_id"]
            isOneToOne: false
            referencedRelation: "view_hub_contests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contest_votes_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "contest_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      contests: {
        Row: {
          additional_images: Json | null
          contest_type: string
          cover_image_url: string | null
          created_at: string
          created_by: string | null
          description: string | null
          end_date: string
          genre: string | null
          id: string
          max_submissions: number | null
          prize_description: string | null
          resource_files: Json | null
          rules: string | null
          start_date: string
          status: string | null
          theme: string | null
          title: string
          updated_at: string
          voting_end_date: string | null
        }
        Insert: {
          additional_images?: Json | null
          contest_type: string
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date: string
          genre?: string | null
          id?: string
          max_submissions?: number | null
          prize_description?: string | null
          resource_files?: Json | null
          rules?: string | null
          start_date: string
          status?: string | null
          theme?: string | null
          title: string
          updated_at?: string
          voting_end_date?: string | null
        }
        Update: {
          additional_images?: Json | null
          contest_type?: string
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string
          genre?: string | null
          id?: string
          max_submissions?: number | null
          prize_description?: string | null
          resource_files?: Json | null
          rules?: string | null
          start_date?: string
          status?: string | null
          theme?: string | null
          title?: string
          updated_at?: string
          voting_end_date?: string | null
        }
        Relationships: []
      }
      contract_signatures: {
        Row: {
          contract_id: string
          id: string
          ip_address: string | null
          signature_data: string
          signed_at: string | null
          signer_id: string
          signer_type: string
          user_agent: string | null
        }
        Insert: {
          contract_id: string
          id?: string
          ip_address?: string | null
          signature_data: string
          signed_at?: string | null
          signer_id: string
          signer_type: string
          user_agent?: string | null
        }
        Update: {
          contract_id?: string
          id?: string
          ip_address?: string | null
          signature_data?: string
          signed_at?: string | null
          signer_id?: string
          signer_type?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_signatures_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "licensing_contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_templates: {
        Row: {
          created_at: string | null
          deliverables: Json | null
          description: string | null
          features: Json | null
          id: string
          is_active: boolean | null
          legal_text: string
          price_range_max: number
          price_range_min: number
          restrictions: Json | null
          template_type: string
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          deliverables?: Json | null
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          legal_text: string
          price_range_max: number
          price_range_min: number
          restrictions?: Json | null
          template_type: string
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          deliverables?: Json | null
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          legal_text?: string
          price_range_max?: number
          price_range_min?: number
          restrictions?: Json | null
          template_type?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          participant_1: string
          participant_2: string
          project_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          participant_1: string
          participant_2: string
          project_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          participant_1?: string
          participant_2?: string
          project_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      course_certificates: {
        Row: {
          certificate_data: Json
          certificate_url: string | null
          course_id: string
          id: string
          issued_at: string
          user_id: string
        }
        Insert: {
          certificate_data?: Json
          certificate_url?: string | null
          course_id: string
          id?: string
          issued_at?: string
          user_id: string
        }
        Update: {
          certificate_data?: Json
          certificate_url?: string | null
          course_id?: string
          id?: string
          issued_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_certificates_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_certificates_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "view_hub_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_materials: {
        Row: {
          content_data: Json
          content_type: string
          course_id: string
          created_at: string
          duration_minutes: number | null
          file_url: string | null
          id: string
          is_free: boolean
          lesson_id: string
          order_index: number
          title: string
          updated_at: string
        }
        Insert: {
          content_data?: Json
          content_type: string
          course_id: string
          created_at?: string
          duration_minutes?: number | null
          file_url?: string | null
          id?: string
          is_free?: boolean
          lesson_id: string
          order_index?: number
          title: string
          updated_at?: string
        }
        Update: {
          content_data?: Json
          content_type?: string
          course_id?: string
          created_at?: string
          duration_minutes?: number | null
          file_url?: string | null
          id?: string
          is_free?: boolean
          lesson_id?: string
          order_index?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_materials_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_materials_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "view_hub_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_pricing: {
        Row: {
          course_id: string
          created_at: string
          id: string
          is_pro_only: boolean | null
          one_time_price: number | null
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          is_pro_only?: boolean | null
          one_time_price?: number | null
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          is_pro_only?: boolean | null
          one_time_price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_pricing_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: true
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_pricing_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: true
            referencedRelation: "view_hub_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_purchases: {
        Row: {
          amount_paid: number
          course_id: string
          id: string
          purchased_at: string
          stripe_payment_intent_id: string | null
          user_id: string
        }
        Insert: {
          amount_paid: number
          course_id: string
          id?: string
          purchased_at?: string
          stripe_payment_intent_id?: string | null
          user_id: string
        }
        Update: {
          amount_paid?: number
          course_id?: string
          id?: string
          purchased_at?: string
          stripe_payment_intent_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_purchases_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_purchases_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "view_hub_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_reviews: {
        Row: {
          course_id: string
          created_at: string
          id: string
          rating: number
          review_text: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          rating: number
          review_text?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          rating?: number
          review_text?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_reviews_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_reviews_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "view_hub_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          content: Json
          created_at: string
          description: string | null
          difficulty_level: string | null
          duration_hours: number | null
          id: string
          instructor_id: string
          is_published: boolean | null
          price: number | null
          tags: string[] | null
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          content?: Json
          created_at?: string
          description?: string | null
          difficulty_level?: string | null
          duration_hours?: number | null
          id?: string
          instructor_id: string
          is_published?: boolean | null
          price?: number | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          content?: Json
          created_at?: string
          description?: string | null
          difficulty_level?: string | null
          duration_hours?: number | null
          id?: string
          instructor_id?: string
          is_published?: boolean | null
          price?: number | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      crm_segment_members: {
        Row: {
          contact_id: string
          creator_id: string
          created_at: string
          last_interaction: string | null
          lifetime_value: number
          segment_id: string
          sources: string[]
          total_spend: number
          updated_at: string
        }
        Insert: {
          contact_id: string
          creator_id: string
          created_at?: string
          last_interaction?: string | null
          lifetime_value?: number
          segment_id: string
          sources?: string[]
          total_spend?: number
          updated_at?: string
        }
        Update: {
          contact_id?: string
          creator_id?: string
          created_at?: string
          last_interaction?: string | null
          lifetime_value?: number
          segment_id?: string
          sources?: string[]
          total_spend?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_segment_members_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "crm_segments"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_segments: {
        Row: {
          contact_count: number
          created_at: string
          creator_id: string
          description: string | null
          filters: Json
          id: string
          manual_contact_ids: string[]
          name: string
          refresh_frequency_minutes: number
          refreshed_at: string | null
          updated_at: string
        }
        Insert: {
          contact_count?: number
          created_at?: string
          creator_id: string
          description?: string | null
          filters?: Json
          id?: string
          manual_contact_ids?: string[]
          name: string
          refresh_frequency_minutes?: number
          refreshed_at?: string | null
          updated_at?: string
        }
        Update: {
          contact_count?: number
          created_at?: string
          creator_id?: string
          description?: string | null
          filters?: Json
          id?: string
          manual_contact_ids?: string[]
          name?: string
          refresh_frequency_minutes?: number
          refreshed_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      creator_bundles: {
        Row: {
          allow_customization: boolean | null
          approved_at: string | null
          approved_by: string | null
          available_from: string | null
          available_until: string | null
          bundle_items: Json
          bundle_price: number
          bundle_type: string
          created_at: string
          description: string | null
          discount_percentage: number | null
          gallery_images: string[] | null
          id: string
          image_url: string | null
          individual_total: number
          is_limited_time: boolean | null
          is_main_store_approved: boolean | null
          main_store_submitted_at: string | null
          max_items: number | null
          min_items: number | null
          owner_id: string | null
          owner_type: string | null
          revenue_total: number | null
          sales_count: number | null
          status: string
          stock_quantity: number | null
          title: string
          updated_at: string
          user_id: string
          view_count: number | null
        }
        Insert: {
          allow_customization?: boolean | null
          approved_at?: string | null
          approved_by?: string | null
          available_from?: string | null
          available_until?: string | null
          bundle_items?: Json
          bundle_price?: number
          bundle_type?: string
          created_at?: string
          description?: string | null
          discount_percentage?: number | null
          gallery_images?: string[] | null
          id?: string
          image_url?: string | null
          individual_total?: number
          is_limited_time?: boolean | null
          is_main_store_approved?: boolean | null
          main_store_submitted_at?: string | null
          max_items?: number | null
          min_items?: number | null
          owner_id?: string | null
          owner_type?: string | null
          revenue_total?: number | null
          sales_count?: number | null
          status?: string
          stock_quantity?: number | null
          title: string
          updated_at?: string
          user_id: string
          view_count?: number | null
        }
        Update: {
          allow_customization?: boolean | null
          approved_at?: string | null
          approved_by?: string | null
          available_from?: string | null
          available_until?: string | null
          bundle_items?: Json
          bundle_price?: number
          bundle_type?: string
          created_at?: string
          description?: string | null
          discount_percentage?: number | null
          gallery_images?: string[] | null
          id?: string
          image_url?: string | null
          individual_total?: number
          is_limited_time?: boolean | null
          is_main_store_approved?: boolean | null
          main_store_submitted_at?: string | null
          max_items?: number | null
          min_items?: number | null
          owner_id?: string | null
          owner_type?: string | null
          revenue_total?: number | null
          sales_count?: number | null
          status?: string
          stock_quantity?: number | null
          title?: string
          updated_at?: string
          user_id?: string
          view_count?: number | null
        }
        Relationships: []
      }
      creator_collectibles: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          blockchain_data: Json | null
          collectible_type: string
          contract_address: string | null
          created_at: string
          current_supply: number | null
          description: string | null
          digital_assets: Json | null
          edition_type: string | null
          expiry_date: string | null
          has_physical_item: boolean | null
          id: string
          is_main_store_approved: boolean | null
          is_minted: boolean | null
          is_transferable: boolean | null
          main_store_submitted_at: string | null
          metadata: Json | null
          owner_id: string | null
          owner_type: string | null
          physical_description: string | null
          price: number
          provides_access: string | null
          rarity_level: string | null
          requires_shipping: boolean | null
          revenue_total: number | null
          sales_count: number | null
          status: string
          title: string
          token_id: string | null
          total_supply: number | null
          unlockable_content: string | null
          updated_at: string
          user_id: string
          view_count: number | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          blockchain_data?: Json | null
          collectible_type: string
          contract_address?: string | null
          created_at?: string
          current_supply?: number | null
          description?: string | null
          digital_assets?: Json | null
          edition_type?: string | null
          expiry_date?: string | null
          has_physical_item?: boolean | null
          id?: string
          is_main_store_approved?: boolean | null
          is_minted?: boolean | null
          is_transferable?: boolean | null
          main_store_submitted_at?: string | null
          metadata?: Json | null
          owner_id?: string | null
          owner_type?: string | null
          physical_description?: string | null
          price?: number
          provides_access?: string | null
          rarity_level?: string | null
          requires_shipping?: boolean | null
          revenue_total?: number | null
          sales_count?: number | null
          status?: string
          title: string
          token_id?: string | null
          total_supply?: number | null
          unlockable_content?: string | null
          updated_at?: string
          user_id: string
          view_count?: number | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          blockchain_data?: Json | null
          collectible_type?: string
          contract_address?: string | null
          created_at?: string
          current_supply?: number | null
          description?: string | null
          digital_assets?: Json | null
          edition_type?: string | null
          expiry_date?: string | null
          has_physical_item?: boolean | null
          id?: string
          is_main_store_approved?: boolean | null
          is_minted?: boolean | null
          is_transferable?: boolean | null
          main_store_submitted_at?: string | null
          metadata?: Json | null
          owner_id?: string | null
          owner_type?: string | null
          physical_description?: string | null
          price?: number
          provides_access?: string | null
          rarity_level?: string | null
          requires_shipping?: boolean | null
          revenue_total?: number | null
          sales_count?: number | null
          status?: string
          title?: string
          token_id?: string | null
          total_supply?: number | null
          unlockable_content?: string | null
          updated_at?: string
          user_id?: string
          view_count?: number | null
        }
        Relationships: []
      }
      creator_email_list: {
        Row: {
          created_at: string | null
          creator_id: string
          id: string
          source: string | null
          subscriber_email: string
          subscriber_id: string | null
          tags: string[] | null
        }
        Insert: {
          created_at?: string | null
          creator_id: string
          id?: string
          source?: string | null
          subscriber_email: string
          subscriber_id?: string | null
          tags?: string[] | null
        }
        Update: {
          created_at?: string | null
          creator_id?: string
          id?: string
          source?: string | null
          subscriber_email?: string
          subscriber_id?: string | null
          tags?: string[] | null
        }
        Relationships: []
      }
      creator_merchandise: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          barcode: string | null
          brand: string | null
          category: string
          colors: string[] | null
          cost_price: number | null
          created_at: string
          description: string | null
          dimensions: Json | null
          gallery_images: string[] | null
          has_variants: boolean | null
          id: string
          image_url: string | null
          is_main_store_approved: boolean | null
          main_store_submitted_at: string | null
          materials: string[] | null
          owner_id: string | null
          owner_type: string | null
          price: number
          product_type: string
          profit_margin: number | null
          requires_shipping: boolean | null
          revenue_total: number | null
          sales_count: number | null
          shipping_class: string | null
          sizes: string[] | null
          sku: string | null
          status: string
          stock_quantity: number | null
          tags: string[] | null
          title: string
          track_inventory: boolean | null
          updated_at: string
          user_id: string
          variant_pricing: Json | null
          view_count: number | null
          weight_grams: number | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          barcode?: string | null
          brand?: string | null
          category: string
          colors?: string[] | null
          cost_price?: number | null
          created_at?: string
          description?: string | null
          dimensions?: Json | null
          gallery_images?: string[] | null
          has_variants?: boolean | null
          id?: string
          image_url?: string | null
          is_main_store_approved?: boolean | null
          main_store_submitted_at?: string | null
          materials?: string[] | null
          owner_id?: string | null
          owner_type?: string | null
          price?: number
          product_type: string
          profit_margin?: number | null
          requires_shipping?: boolean | null
          revenue_total?: number | null
          sales_count?: number | null
          shipping_class?: string | null
          sizes?: string[] | null
          sku?: string | null
          status?: string
          stock_quantity?: number | null
          tags?: string[] | null
          title: string
          track_inventory?: boolean | null
          updated_at?: string
          user_id: string
          variant_pricing?: Json | null
          view_count?: number | null
          weight_grams?: number | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          barcode?: string | null
          brand?: string | null
          category?: string
          colors?: string[] | null
          cost_price?: number | null
          created_at?: string
          description?: string | null
          dimensions?: Json | null
          gallery_images?: string[] | null
          has_variants?: boolean | null
          id?: string
          image_url?: string | null
          is_main_store_approved?: boolean | null
          main_store_submitted_at?: string | null
          materials?: string[] | null
          owner_id?: string | null
          owner_type?: string | null
          price?: number
          product_type?: string
          profit_margin?: number | null
          requires_shipping?: boolean | null
          revenue_total?: number | null
          sales_count?: number | null
          shipping_class?: string | null
          sizes?: string[] | null
          sku?: string | null
          status?: string
          stock_quantity?: number | null
          tags?: string[] | null
          title?: string
          track_inventory?: boolean | null
          updated_at?: string
          user_id?: string
          variant_pricing?: Json | null
          view_count?: number | null
          weight_grams?: number | null
        }
        Relationships: []
      }
      creator_metrics: {
        Row: {
          audience_geo: Json | null
          battle_revenue_cents: number | null
          battles_entries_count: number
          churn_30d: number | null
          comments_count: number
          created_at: string
          creator_id: string
          event_revenue_cents: number | null
          id: string
          likes_count: number
          metric_date: string
          new_fans_30d: number | null
          plays_count: number | null
          post_comments: number | null
          post_likes: number | null
          retention_30d: number | null
          revenue_cents: number
          sales_count: number | null
          sales_revenue_cents: number | null
          subs_active: number | null
          subs_count: number
          subs_mrr_cents: number | null
        }
        Insert: {
          audience_geo?: Json | null
          battle_revenue_cents?: number | null
          battles_entries_count?: number
          churn_30d?: number | null
          comments_count?: number
          created_at?: string
          creator_id: string
          event_revenue_cents?: number | null
          id?: string
          likes_count?: number
          metric_date?: string
          new_fans_30d?: number | null
          plays_count?: number | null
          post_comments?: number | null
          post_likes?: number | null
          retention_30d?: number | null
          revenue_cents?: number
          sales_count?: number | null
          sales_revenue_cents?: number | null
          subs_active?: number | null
          subs_count?: number
          subs_mrr_cents?: number | null
        }
        Update: {
          audience_geo?: Json | null
          battle_revenue_cents?: number | null
          battles_entries_count?: number
          churn_30d?: number | null
          comments_count?: number
          created_at?: string
          creator_id?: string
          event_revenue_cents?: number | null
          id?: string
          likes_count?: number
          metric_date?: string
          new_fans_30d?: number | null
          plays_count?: number | null
          post_comments?: number | null
          post_likes?: number | null
          retention_30d?: number | null
          revenue_cents?: number
          sales_count?: number | null
          sales_revenue_cents?: number | null
          subs_active?: number | null
          subs_count?: number
          subs_mrr_cents?: number | null
        }
        Relationships: []
      }
      creator_page_views: {
        Row: {
          created_at: string | null
          creator_id: string
          id: string
          page_type: string
          referrer: string | null
          user_agent: string | null
          visitor_id: string | null
        }
        Insert: {
          created_at?: string | null
          creator_id: string
          id?: string
          page_type: string
          referrer?: string | null
          user_agent?: string | null
          visitor_id?: string | null
        }
        Update: {
          created_at?: string | null
          creator_id?: string
          id?: string
          page_type?: string
          referrer?: string | null
          user_agent?: string | null
          visitor_id?: string | null
        }
        Relationships: []
      }
      creator_subscription_tiers: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          perks: string[] | null
          price_cents: number
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          perks?: string[] | null
          price_cents: number
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          perks?: string[] | null
          price_cents?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_prompts: {
        Row: {
          created_at: string
          cta_href: string | null
          cta_text: string | null
          ends_at: string | null
          id: string
          starts_at: string | null
          tag: string | null
          text: string
        }
        Insert: {
          created_at?: string
          cta_href?: string | null
          cta_text?: string | null
          ends_at?: string | null
          id?: string
          starts_at?: string | null
          tag?: string | null
          text: string
        }
        Update: {
          created_at?: string
          cta_href?: string | null
          cta_text?: string | null
          ends_at?: string | null
          id?: string
          starts_at?: string | null
          tag?: string | null
          text?: string
        }
        Relationships: []
      }
      deletion_requests: {
        Row: {
          confirmed_at: string | null
          created_at: string
          id: string
          label_id: string
          payload_json: Json
          requested_by: string
          type: Database["public"]["Enums"]["label_deletion_type"]
        }
        Insert: {
          confirmed_at?: string | null
          created_at?: string
          id?: string
          label_id: string
          payload_json?: Json
          requested_by: string
          type: Database["public"]["Enums"]["label_deletion_type"]
        }
        Update: {
          confirmed_at?: string | null
          created_at?: string
          id?: string
          label_id?: string
          payload_json?: Json
          requested_by?: string
          type?: Database["public"]["Enums"]["label_deletion_type"]
        }
        Relationships: [
          {
            foreignKeyName: "deletion_requests_label_id_fkey"
            columns: ["label_id"]
            isOneToOne: false
            referencedRelation: "labels"
            referencedColumns: ["id"]
          },
        ]
      }
      directory_submissions: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          bio: string
          created_at: string
          credits: string[] | null
          experience: string | null
          genres: string[] | null
          hourly_rate: string | null
          id: string
          location: string | null
          social_links: Json | null
          status: Database["public"]["Enums"]["submission_status"] | null
          title: string
          updated_at: string
          user_id: string
          website_url: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          bio: string
          created_at?: string
          credits?: string[] | null
          experience?: string | null
          genres?: string[] | null
          hourly_rate?: string | null
          id?: string
          location?: string | null
          social_links?: Json | null
          status?: Database["public"]["Enums"]["submission_status"] | null
          title: string
          updated_at?: string
          user_id: string
          website_url?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          bio?: string
          created_at?: string
          credits?: string[] | null
          experience?: string | null
          genres?: string[] | null
          hourly_rate?: string | null
          id?: string
          location?: string | null
          social_links?: Json | null
          status?: Database["public"]["Enums"]["submission_status"] | null
          title?: string
          updated_at?: string
          user_id?: string
          website_url?: string | null
        }
        Relationships: []
      }
      download_events: {
        Row: {
          created_at: string | null
          file_path: string
          id: string
          purchase_id: string
          purchase_type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          file_path: string
          id?: string
          purchase_id: string
          purchase_type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          file_path?: string
          id?: string
          purchase_id?: string
          purchase_type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      event_rsvps: {
        Row: {
          created_at: string
          event_id: string | null
          id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id?: string | null
          id?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string | null
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_rsvps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_tickets: {
        Row: {
          created_at: string
          event_id: string
          id: string
          payment_status: string
          stripe_payment_intent_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          payment_status?: string
          stripe_payment_intent_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          payment_status?: string
          stripe_payment_intent_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_tickets_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          cover_image_url: string | null
          created_at: string
          created_by: string
          description: string | null
          ends_at: string
          id: string
          location: string | null
          playback_url: string | null
          price_cents: number
          rrule: string | null
          rsvp_count: number
          starts_at: string
          stream_provider: string | null
          stream_url: string | null
          timezone: string | null
          title: string
          updated_at: string
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          ends_at: string
          id?: string
          location?: string | null
          playback_url?: string | null
          price_cents?: number
          rrule?: string | null
          rsvp_count?: number
          starts_at: string
          stream_provider?: string | null
          stream_url?: string | null
          timezone?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          ends_at?: string
          id?: string
          location?: string | null
          playback_url?: string | null
          price_cents?: number
          rrule?: string | null
          rsvp_count?: number
          starts_at?: string
          stream_provider?: string | null
          stream_url?: string | null
          timezone?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      fan_club_content: {
        Row: {
          created_at: string
          creator_id: string | null
          id: string
          release_id: string | null
          subscription_tier_required: string
        }
        Insert: {
          created_at?: string
          creator_id?: string | null
          id?: string
          release_id?: string | null
          subscription_tier_required?: string
        }
        Update: {
          created_at?: string
          creator_id?: string | null
          id?: string
          release_id?: string | null
          subscription_tier_required?: string
        }
        Relationships: [
          {
            foreignKeyName: "fan_club_content_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: true
            referencedRelation: "releases"
            referencedColumns: ["id"]
          },
        ]
      }
      fan_subscriptions: {
        Row: {
          created_at: string
          creator_id: string
          fan_id: string
          id: string
          price_cents: number
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          fan_id: string
          id?: string
          price_cents?: number
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          fan_id?: string
          id?: string
          price_cents?: number
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      favorites: {
        Row: {
          beat_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          beat_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          beat_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_beat_id_fkey"
            columns: ["beat_id"]
            isOneToOne: false
            referencedRelation: "beats"
            referencedColumns: ["id"]
          },
        ]
      }
      gated_content: {
        Row: {
          allowed_tier_ids: string[] | null
          content_id: string
          content_type: string
          created_at: string
          gate_type: Database["public"]["Enums"]["content_gate_type"]
          id: string
          minimum_tier_id: string | null
          owner_id: string
          owner_type: string
          preview_duration: number | null
          preview_text: string | null
        }
        Insert: {
          allowed_tier_ids?: string[] | null
          content_id: string
          content_type: string
          created_at?: string
          gate_type?: Database["public"]["Enums"]["content_gate_type"]
          id?: string
          minimum_tier_id?: string | null
          owner_id: string
          owner_type: string
          preview_duration?: number | null
          preview_text?: string | null
        }
        Update: {
          allowed_tier_ids?: string[] | null
          content_id?: string
          content_type?: string
          created_at?: string
          gate_type?: Database["public"]["Enums"]["content_gate_type"]
          id?: string
          minimum_tier_id?: string | null
          owner_id?: string
          owner_type?: string
          preview_duration?: number | null
          preview_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gated_content_minimum_tier_id_fkey"
            columns: ["minimum_tier_id"]
            isOneToOne: false
            referencedRelation: "membership_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      genre_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          parent_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          parent_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          parent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "genre_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "genre_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      label_invitations: {
        Row: {
          accepted_at: string | null
          accepted_by_user_id: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          label_id: string
          role: Database["public"]["Enums"]["label_member_role"]
          token: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by_user_id?: string | null
          created_at?: string
          email: string
          expires_at: string
          id?: string
          invited_by?: string | null
          label_id: string
          role?: Database["public"]["Enums"]["label_member_role"]
          token: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by_user_id?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          label_id?: string
          role?: Database["public"]["Enums"]["label_member_role"]
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "label_invitations_label_id_fkey"
            columns: ["label_id"]
            isOneToOne: false
            referencedRelation: "labels"
            referencedColumns: ["id"]
          },
        ]
      }
      label_members: {
        Row: {
          created_at: string
          id: string
          label_id: string
          role: Database["public"]["Enums"]["label_member_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          label_id: string
          role?: Database["public"]["Enums"]["label_member_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          label_id?: string
          role?: Database["public"]["Enums"]["label_member_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "label_members_label_id_fkey"
            columns: ["label_id"]
            isOneToOne: false
            referencedRelation: "labels"
            referencedColumns: ["id"]
          },
        ]
      }
      label_stripe_accounts: {
        Row: {
          capabilities: Json | null
          created_at: string
          label_id: string
          onboarding_complete: boolean | null
          requirements: Json | null
          stripe_account_id: string | null
          updated_at: string
        }
        Insert: {
          capabilities?: Json | null
          created_at?: string
          label_id: string
          onboarding_complete?: boolean | null
          requirements?: Json | null
          stripe_account_id?: string | null
          updated_at?: string
        }
        Update: {
          capabilities?: Json | null
          created_at?: string
          label_id?: string
          onboarding_complete?: boolean | null
          requirements?: Json | null
          stripe_account_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      labels: {
        Row: {
          claimed_at: string | null
          contact_email: string | null
          country: string | null
          cover_image_url: string | null
          created_at: string
          created_by_admin: boolean
          genre: string | null
          id: string
          logo_url: string | null
          name: string
          owner_user_id: string | null
          slug: string
          storefront_settings: Json | null
          updated_at: string
        }
        Insert: {
          claimed_at?: string | null
          contact_email?: string | null
          country?: string | null
          cover_image_url?: string | null
          created_at?: string
          created_by_admin?: boolean
          genre?: string | null
          id?: string
          logo_url?: string | null
          name: string
          owner_user_id?: string | null
          slug: string
          storefront_settings?: Json | null
          updated_at?: string
        }
        Update: {
          claimed_at?: string | null
          contact_email?: string | null
          country?: string | null
          cover_image_url?: string | null
          created_at?: string
          created_by_admin?: boolean
          genre?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          owner_user_id?: string | null
          slug?: string
          storefront_settings?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      license_templates: {
        Row: {
          created_at: string
          description: string | null
          file_types: string[]
          id: string
          is_active: boolean | null
          license_type: string
          name: string
          price: number
          terms: string | null
          updated_at: string
          usage_rights: Json | null
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          file_types?: string[]
          id?: string
          is_active?: boolean | null
          license_type: string
          name: string
          price?: number
          terms?: string | null
          updated_at?: string
          usage_rights?: Json | null
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          file_types?: string[]
          id?: string
          is_active?: boolean | null
          license_type?: string
          name?: string
          price?: number
          terms?: string | null
          updated_at?: string
          usage_rights?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      licensing_contracts: {
        Row: {
          artist_id: string
          artist_ip_address: string | null
          artist_signature: string | null
          beat_id: string
          contract_data: Json
          contract_pdf_url: string | null
          created_at: string | null
          id: string
          legal_text: string
          license_fee: number
          producer_id: string
          producer_ip_address: string | null
          producer_signature: string | null
          signed_at: string | null
          status: string
          stripe_payment_intent_id: string | null
          template_type: string
          transaction_id: string | null
          updated_at: string | null
        }
        Insert: {
          artist_id: string
          artist_ip_address?: string | null
          artist_signature?: string | null
          beat_id: string
          contract_data?: Json
          contract_pdf_url?: string | null
          created_at?: string | null
          id?: string
          legal_text: string
          license_fee: number
          producer_id: string
          producer_ip_address?: string | null
          producer_signature?: string | null
          signed_at?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          template_type: string
          transaction_id?: string | null
          updated_at?: string | null
        }
        Update: {
          artist_id?: string
          artist_ip_address?: string | null
          artist_signature?: string | null
          beat_id?: string
          contract_data?: Json
          contract_pdf_url?: string | null
          created_at?: string | null
          id?: string
          legal_text?: string
          license_fee?: number
          producer_id?: string
          producer_ip_address?: string | null
          producer_signature?: string | null
          signed_at?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          template_type?: string
          transaction_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "licensing_contracts_beat_id_fkey"
            columns: ["beat_id"]
            isOneToOne: false
            referencedRelation: "beats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "licensing_contracts_template_type_fkey"
            columns: ["template_type"]
            isOneToOne: false
            referencedRelation: "contract_templates"
            referencedColumns: ["template_type"]
          },
        ]
      }
      licensing_options: {
        Row: {
          beat_id: string
          created_at: string | null
          id: string
          is_available: boolean | null
          license_type: string
          price: number
          updated_at: string | null
        }
        Insert: {
          beat_id: string
          created_at?: string | null
          id?: string
          is_available?: boolean | null
          license_type: string
          price?: number
          updated_at?: string | null
        }
        Update: {
          beat_id?: string
          created_at?: string | null
          id?: string
          is_available?: boolean | null
          license_type?: string
          price?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "licensing_options_beat_id_fkey"
            columns: ["beat_id"]
            isOneToOne: false
            referencedRelation: "beats"
            referencedColumns: ["id"]
          },
        ]
      }
      likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "view_hub_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      live_gift_catalog: {
        Row: {
          animation_url: string | null
          created_at: string
          credit_cost: number
          description: string | null
          id: string
          is_active: boolean
          label: string
          metadata: Json | null
          slug: string
          thumbnail_url: string | null
          updated_at: string
        }
        Insert: {
          animation_url?: string | null
          created_at?: string
          credit_cost: number
          description?: string | null
          id?: string
          is_active?: boolean
          label: string
          metadata?: Json | null
          slug: string
          thumbnail_url?: string | null
          updated_at?: string
        }
        Update: {
          animation_url?: string | null
          created_at?: string
          credit_cost?: number
          description?: string | null
          id?: string
          is_active?: boolean
          label?: string
          metadata?: Json | null
          slug?: string
          thumbnail_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      live_gift_events: {
        Row: {
          animation_variant: string | null
          created_at: string
          gift_id: string
          id: string
          message: string | null
          quantity: number
          room_id: string
          sender_id: string
          total_credits: number
        }
        Insert: {
          animation_variant?: string | null
          created_at?: string
          gift_id: string
          id?: string
          message?: string | null
          quantity?: number
          room_id: string
          sender_id: string
          total_credits: number
        }
        Update: {
          animation_variant?: string | null
          created_at?: string
          gift_id?: string
          id?: string
          message?: string | null
          quantity?: number
          room_id?: string
          sender_id?: string
          total_credits?: number
        }
        Relationships: [
          {
            foreignKeyName: "live_gift_events_gift_id_fkey"
            columns: ["gift_id"]
            isOneToOne: false
            referencedRelation: "live_gift_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_gift_events_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "session_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      live_sessions: {
        Row: {
          created_at: string
          creator_id: string
          description: string | null
          duration_minutes: number
          id: string
          is_free: boolean
          max_participants: number | null
          price_cents: number
          recording_url: string | null
          scheduled_for: string
          session_type: string
          status: string
          stream_url: string | null
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          description?: string | null
          duration_minutes?: number
          id?: string
          is_free?: boolean
          max_participants?: number | null
          price_cents?: number
          recording_url?: string | null
          scheduled_for: string
          session_type?: string
          status?: string
          stream_url?: string | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          is_free?: boolean
          max_participants?: number | null
          price_cents?: number
          recording_url?: string | null
          scheduled_for?: string
          session_type?: string
          status?: string
          stream_url?: string | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      mailing_list: {
        Row: {
          created_at: string
          email: string
          id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
        }
        Relationships: []
      }
      mailing_list_rate_limits: {
        Row: {
          email: string
          first_submission_at: string
          id: string
          ip_address: unknown
          last_submission_at: string
          submission_count: number
        }
        Insert: {
          email: string
          first_submission_at?: string
          id?: string
          ip_address: unknown
          last_submission_at?: string
          submission_count?: number
        }
        Update: {
          email?: string
          first_submission_at?: string
          id?: string
          ip_address?: unknown
          last_submission_at?: string
          submission_count?: number
        }
        Relationships: []
      }
      managed_profiles: {
        Row: {
          accepted_at: string | null
          created_at: string
          id: string
          invited_by: string | null
          label_id: string
          profile_id: string
          role: Database["public"]["Enums"]["managed_profile_role"] | null
          status: Database["public"]["Enums"]["managed_profile_status"] | null
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          invited_by?: string | null
          label_id: string
          profile_id: string
          role?: Database["public"]["Enums"]["managed_profile_role"] | null
          status?: Database["public"]["Enums"]["managed_profile_status"] | null
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          invited_by?: string | null
          label_id?: string
          profile_id?: string
          role?: Database["public"]["Enums"]["managed_profile_role"] | null
          status?: Database["public"]["Enums"]["managed_profile_status"] | null
        }
        Relationships: []
      }
      membership_discord_tokens: {
        Row: {
          access_token: string
          created_at: string
          discord_user_id: string
          discord_username: string | null
          expires_at: string
          id: string
          membership_id: string
          refresh_token: string
          roles_synced_at: string | null
          sync_error: string | null
          updated_at: string
        }
        Insert: {
          access_token: string
          created_at?: string
          discord_user_id: string
          discord_username?: string | null
          expires_at: string
          id?: string
          membership_id: string
          refresh_token: string
          roles_synced_at?: string | null
          sync_error?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string
          created_at?: string
          discord_user_id?: string
          discord_username?: string | null
          expires_at?: string
          id?: string
          membership_id?: string
          refresh_token?: string
          roles_synced_at?: string | null
          sync_error?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "membership_discord_tokens_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
        ]
      }
      membership_metrics: {
        Row: {
          churned_members: number
          created_at: string
          date: string
          gross_revenue: number
          id: string
          net_revenue: number
          new_members: number
          owner_id: string
          owner_type: string
          tier_breakdown: Json | null
          total_members: number
        }
        Insert: {
          churned_members?: number
          created_at?: string
          date: string
          gross_revenue?: number
          id?: string
          net_revenue?: number
          new_members?: number
          owner_id: string
          owner_type: string
          tier_breakdown?: Json | null
          total_members?: number
        }
        Update: {
          churned_members?: number
          created_at?: string
          date?: string
          gross_revenue?: number
          id?: string
          net_revenue?: number
          new_members?: number
          owner_id?: string
          owner_type?: string
          tier_breakdown?: Json | null
          total_members?: number
        }
        Relationships: []
      }
      membership_perks: {
        Row: {
          config: Json | null
          created_at: string
          description: string | null
          enabled: boolean
          id: string
          name: string
          tier_id: string
          type: Database["public"]["Enums"]["perk_type"]
        }
        Insert: {
          config?: Json | null
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          name: string
          tier_id: string
          type: Database["public"]["Enums"]["perk_type"]
        }
        Update: {
          config?: Json | null
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          name?: string
          tier_id?: string
          type?: Database["public"]["Enums"]["perk_type"]
        }
        Relationships: [
          {
            foreignKeyName: "membership_perks_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "membership_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      membership_tiers: {
        Row: {
          color: string | null
          created_at: string
          currency: string
          current_members: number
          description: string | null
          emoji: string | null
          features: Json | null
          id: string
          image_url: string | null
          max_members: number | null
          name: string
          owner_id: string
          owner_type: string
          price_lifetime: number | null
          price_monthly: number | null
          price_yearly: number | null
          slug: string
          status: Database["public"]["Enums"]["tier_status"]
          tier_order: number
          stripe_price_lifetime_id: string | null
          stripe_price_monthly_id: string | null
          stripe_price_yearly_id: string | null
          stripe_product_id: string | null
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          currency?: string
          current_members?: number
          description?: string | null
          emoji?: string | null
          features?: Json | null
          id?: string
          image_url?: string | null
          max_members?: number | null
          name: string
          owner_id: string
          owner_type: string
          price_lifetime?: number | null
          price_monthly?: number | null
          price_yearly?: number | null
          slug: string
          status?: Database["public"]["Enums"]["tier_status"]
          tier_order?: number
          stripe_price_lifetime_id?: string | null
          stripe_price_monthly_id?: string | null
          stripe_price_yearly_id?: string | null
          stripe_product_id?: string | null
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          currency?: string
          current_members?: number
          description?: string | null
          emoji?: string | null
          features?: Json | null
          id?: string
          image_url?: string | null
          max_members?: number | null
          name?: string
          owner_id?: string
          owner_type?: string
          price_lifetime?: number | null
          price_monthly?: number | null
          price_yearly?: number | null
          slug?: string
          status?: Database["public"]["Enums"]["tier_status"]
          tier_order?: number
          stripe_price_lifetime_id?: string | null
          stripe_price_monthly_id?: string | null
          stripe_price_yearly_id?: string | null
          stripe_product_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      memberships: {
        Row: {
          billing_period: Database["public"]["Enums"]["billing_period"]
          cancelled_at: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string
          expires_at: string | null
          id: string
          metadata: Json | null
          started_at: string
          status: Database["public"]["Enums"]["membership_status"]
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          support_amount: number
          tier_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          billing_period: Database["public"]["Enums"]["billing_period"]
          cancelled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          started_at?: string
          status?: Database["public"]["Enums"]["membership_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          support_amount?: number
          tier_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          billing_period?: Database["public"]["Enums"]["billing_period"]
          cancelled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          started_at?: string
          status?: Database["public"]["Enums"]["membership_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          support_amount?: number
          tier_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "membership_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          is_read: boolean | null
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_messages_conversation_id"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      moderation_actions: {
        Row: {
          action: string
          created_at: string
          id: string
          moderator_id: string
          reason: string | null
          target_id: string
          target_type: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          moderator_id: string
          reason?: string | null
          target_id: string
          target_type: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          moderator_id?: string
          reason?: string | null
          target_id?: string
          target_type?: string
        }
        Relationships: []
      }
      moderation_items: {
        Row: {
          admin_notes: string | null
          created_at: string
          id: string
          item_id: string
          item_type: string
          reason: string | null
          reported_by: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          severity: string
          status: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          item_id: string
          item_type: string
          reason?: string | null
          reported_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          severity?: string
          status?: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          item_id?: string
          item_type?: string
          reason?: string | null
          reported_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          severity?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      monthly_challenges: {
        Row: {
          created_at: string
          description: string | null
          end_date: string
          id: string
          prize_description: string | null
          rules: string | null
          start_date: string
          status: string
          theme: string | null
          title: string
          updated_at: string
          voting_end_date: string | null
          winner_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_date: string
          id?: string
          prize_description?: string | null
          rules?: string | null
          start_date: string
          status?: string
          theme?: string | null
          title: string
          updated_at?: string
          voting_end_date?: string | null
          winner_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          end_date?: string
          id?: string
          prize_description?: string | null
          rules?: string | null
          start_date?: string
          status?: string
          theme?: string | null
          title?: string
          updated_at?: string
          voting_end_date?: string | null
          winner_id?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          data: Json | null
          id: string
          message: string
          read: boolean
          related_id: string | null
          related_type: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: string
          message: string
          read?: boolean
          related_id?: string | null
          related_type?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          id?: string
          message?: string
          read?: boolean
          related_id?: string | null
          related_type?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          creator_id: string | null
          id: string
          kind: string | null
          license_pdf_url: string | null
          order_id: string
          price: number
          product_id: string
          quantity: number
        }
        Insert: {
          created_at?: string
          creator_id?: string | null
          id?: string
          kind?: string | null
          license_pdf_url?: string | null
          order_id: string
          price: number
          product_id: string
          quantity?: number
        }
        Update: {
          created_at?: string
          creator_id?: string | null
          id?: string
          kind?: string | null
          license_pdf_url?: string | null
          order_id?: string
          price?: number
          product_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "store_products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          id: string
          invoice_pdf_url: string | null
          paid_at: string | null
          payment_id: string | null
          payment_provider: string | null
          referral_reward_credits: number | null
          referral_reward_status: string | null
          referrer_code: string | null
          shipping_address: Json | null
          status: string
          stripe_session_id: string | null
          total_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invoice_pdf_url?: string | null
          paid_at?: string | null
          payment_id?: string | null
          payment_provider?: string | null
          referral_reward_credits?: number | null
          referral_reward_status?: string | null
          referrer_code?: string | null
          shipping_address?: Json | null
          status?: string
          stripe_session_id?: string | null
          total_amount: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invoice_pdf_url?: string | null
          paid_at?: string | null
          payment_id?: string | null
          payment_provider?: string | null
          referral_reward_credits?: number | null
          referral_reward_status?: string | null
          referrer_code?: string | null
          shipping_address?: Json | null
          status?: string
          stripe_session_id?: string | null
          total_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ownership_transfer_requests: {
        Row: {
          accepted_at: string | null
          created_at: string
          expires_at: string
          from_user_id: string
          id: string
          label_id: string
          to_email: string | null
          to_user_id: string | null
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          expires_at: string
          from_user_id: string
          id?: string
          label_id: string
          to_email?: string | null
          to_user_id?: string | null
          token: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          expires_at?: string
          from_user_id?: string
          id?: string
          label_id?: string
          to_email?: string | null
          to_user_id?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "ownership_transfer_requests_label_id_fkey"
            columns: ["label_id"]
            isOneToOne: false
            referencedRelation: "labels"
            referencedColumns: ["id"]
          },
        ]
      }
      payout_batches: {
        Row: {
          batch_id: string
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          status: string
          total_amount: number
          total_producers: number
        }
        Insert: {
          batch_id: string
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          status?: string
          total_amount?: number
          total_producers?: number
        }
        Update: {
          batch_id?: string
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          status?: string
          total_amount?: number
          total_producers?: number
        }
        Relationships: []
      }
      payout_records: {
        Row: {
          amount: number
          beat_id: string | null
          created_at: string
          id: string
          payout_method: string
          payout_reference: string | null
          payout_status: string
          processed_at: string | null
          purchase_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          beat_id?: string | null
          created_at?: string
          id?: string
          payout_method?: string
          payout_reference?: string | null
          payout_status?: string
          processed_at?: string | null
          purchase_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          beat_id?: string | null
          created_at?: string
          id?: string
          payout_method?: string
          payout_reference?: string | null
          payout_status?: string
          processed_at?: string | null
          purchase_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payout_records_beat_id_fkey"
            columns: ["beat_id"]
            isOneToOne: false
            referencedRelation: "beats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payout_records_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      playlist_collaborators: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          id: string
          invited_at: string | null
          playlist_id: string
          role: string
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          id?: string
          invited_at?: string | null
          playlist_id: string
          role?: string
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          id?: string
          invited_at?: string | null
          playlist_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "playlist_collaborators_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "playlists"
            referencedColumns: ["id"]
          },
        ]
      }
      playlist_items: {
        Row: {
          added_at: string
          beat_id: string | null
          id: string
          playlist_id: string
          position: number | null
          release_id: string | null
        }
        Insert: {
          added_at?: string
          beat_id?: string | null
          id?: string
          playlist_id: string
          position?: number | null
          release_id?: string | null
        }
        Update: {
          added_at?: string
          beat_id?: string | null
          id?: string
          playlist_id?: string
          position?: number | null
          release_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "playlist_items_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "playlists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playlist_items_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "releases"
            referencedColumns: ["id"]
          },
        ]
      }
      playlists: {
        Row: {
          collaborative: boolean | null
          cover_art_url: string | null
          created_at: string
          description: string | null
          id: string
          is_public: boolean | null
          name: string
          tags: string[] | null
          updated_at: string
          user_id: string
          visibility: string | null
        }
        Insert: {
          collaborative?: boolean | null
          cover_art_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean | null
          name: string
          tags?: string[] | null
          updated_at?: string
          user_id: string
          visibility?: string | null
        }
        Update: {
          collaborative?: boolean | null
          cover_art_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean | null
          name?: string
          tags?: string[] | null
          updated_at?: string
          user_id?: string
          visibility?: string | null
        }
        Relationships: []
      }
      plug_schedules: {
        Row: {
          automation_type: Database["public"]["Enums"]["automation_type"]
          config_json: Json
          created_at: string
          id: string
          is_enabled: boolean
          next_run_at: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          automation_type: Database["public"]["Enums"]["automation_type"]
          config_json?: Json
          created_at?: string
          id?: string
          is_enabled?: boolean
          next_run_at?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          automation_type?: Database["public"]["Enums"]["automation_type"]
          config_json?: Json
          created_at?: string
          id?: string
          is_enabled?: boolean
          next_run_at?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      post_analytics: {
        Row: {
          clicks: number | null
          comments: number | null
          created_at: string | null
          creator_id: string
          engagement_rate: number | null
          id: string
          impressions: number | null
          likes: number | null
          platform: string
          post_id: string
          shares: number | null
        }
        Insert: {
          clicks?: number | null
          comments?: number | null
          created_at?: string | null
          creator_id: string
          engagement_rate?: number | null
          id?: string
          impressions?: number | null
          likes?: number | null
          platform: string
          post_id: string
          shares?: number | null
        }
        Update: {
          clicks?: number | null
          comments?: number | null
          created_at?: string | null
          creator_id?: string
          engagement_rate?: number | null
          id?: string
          impressions?: number | null
          likes?: number | null
          platform?: string
          post_id?: string
          shares?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "post_analytics_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          comments_count: number
          content: string
          created_at: string
          id: string
          likes_count: number
          owner_id: string | null
          owner_type: string | null
          tags: string[] | null
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          comments_count?: number
          content: string
          created_at?: string
          id?: string
          likes_count?: number
          owner_id?: string | null
          owner_type?: string | null
          tags?: string[] | null
          title: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          comments_count?: number
          content?: string
          created_at?: string
          id?: string
          likes_count?: number
          owner_id?: string | null
          owner_type?: string | null
          tags?: string[] | null
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      producer_earnings: {
        Row: {
          beats_sold_count: number
          commission_earned: number
          created_at: string
          date_recorded: string
          id: string
          monthly_revenue: number
          paid_earnings: number
          pending_earnings: number
          producer_id: string
          total_earnings: number
          total_sales_volume: number
          updated_at: string
        }
        Insert: {
          beats_sold_count?: number
          commission_earned?: number
          created_at?: string
          date_recorded?: string
          id?: string
          monthly_revenue?: number
          paid_earnings?: number
          pending_earnings?: number
          producer_id: string
          total_earnings?: number
          total_sales_volume?: number
          updated_at?: string
        }
        Update: {
          beats_sold_count?: number
          commission_earned?: number
          created_at?: string
          date_recorded?: string
          id?: string
          monthly_revenue?: number
          paid_earnings?: number
          pending_earnings?: number
          producer_id?: string
          total_earnings?: number
          total_sales_volume?: number
          updated_at?: string
        }
        Relationships: []
      }
      producer_payouts: {
        Row: {
          adjusted_amount_cents: number | null
          admin_note: string | null
          beat_id: string
          created_at: string | null
          from_credits: boolean | null
          gross_amount: number
          id: string
          net_amount: number
          payout_status: string | null
          payout_type: string | null
          platform_fee: number
          processed_at: string | null
          producer_id: string
          purchase_id: string
          stripe_transfer_id: string | null
          updated_at: string | null
        }
        Insert: {
          adjusted_amount_cents?: number | null
          admin_note?: string | null
          beat_id: string
          created_at?: string | null
          from_credits?: boolean | null
          gross_amount: number
          id?: string
          net_amount: number
          payout_status?: string | null
          payout_type?: string | null
          platform_fee: number
          processed_at?: string | null
          producer_id: string
          purchase_id: string
          stripe_transfer_id?: string | null
          updated_at?: string | null
        }
        Update: {
          adjusted_amount_cents?: number | null
          admin_note?: string | null
          beat_id?: string
          created_at?: string | null
          from_credits?: boolean | null
          gross_amount?: number
          id?: string
          net_amount?: number
          payout_status?: string | null
          payout_type?: string | null
          platform_fee?: number
          processed_at?: string | null
          producer_id?: string
          purchase_id?: string
          stripe_transfer_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "producer_payouts_beat_id_fkey"
            columns: ["beat_id"]
            isOneToOne: false
            referencedRelation: "beats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "producer_payouts_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      producer_stripe_accounts: {
        Row: {
          account_status: string | null
          capabilities: Json | null
          country: string | null
          created_at: string | null
          default_currency: string | null
          details_submitted: boolean | null
          external_account_id: string | null
          id: string
          onboarding_complete: boolean | null
          payouts_enabled: boolean | null
          requirements: Json | null
          stripe_account_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_status?: string | null
          capabilities?: Json | null
          country?: string | null
          created_at?: string | null
          default_currency?: string | null
          details_submitted?: boolean | null
          external_account_id?: string | null
          id?: string
          onboarding_complete?: boolean | null
          payouts_enabled?: boolean | null
          requirements?: Json | null
          stripe_account_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_status?: string | null
          capabilities?: Json | null
          country?: string | null
          created_at?: string | null
          default_currency?: string | null
          details_submitted?: boolean | null
          external_account_id?: string | null
          id?: string
          onboarding_complete?: boolean | null
          payouts_enabled?: boolean | null
          requirements?: Json | null
          stripe_account_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      product_images: {
        Row: {
          created_at: string
          display_order: number | null
          id: string
          image_url: string
          product_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number | null
          id?: string
          image_url: string
          product_id: string
        }
        Update: {
          created_at?: string
          display_order?: number | null
          id?: string
          image_url?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "store_products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_options: {
        Row: {
          created_at: string
          id: string
          option_type: string
          option_value: string
          price_modifier: number | null
          product_id: string
          stock_quantity: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          option_type: string
          option_value: string
          price_modifier?: number | null
          product_id: string
          stock_quantity?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          option_type?: string
          option_value?: string
          price_modifier?: number | null
          product_id?: string
          stock_quantity?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_options_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "store_products"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          cover_image_url: string | null
          created_at: string
          discord_guild_id: string | null
          discord_role_map: Json | null
          embed_settings: Json | null
          full_name: string | null
          id: string
          is_creator: boolean | null
          is_label: boolean | null
          is_verified: boolean | null
          logo_url: string | null
          mailchimp_auto_sync: boolean | null
          mailchimp_list_id: string | null
          mailchimp_status: string | null
          onboarding_completed: boolean | null
          onboarding_progress: Json | null
          presskit_url: string | null
          profile_type: string | null
          referral_code: string | null
          referral_rewards_earned: number | null
          referral_signups_count: number | null
          slug: string | null
          updated_at: string
          user_id: string
          user_type: Database["public"]["Enums"]["user_type"] | null
          username: string | null
          verification_note: string | null
          verification_status: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          cover_image_url?: string | null
          created_at?: string
          discord_guild_id?: string | null
          discord_role_map?: Json | null
          embed_settings?: Json | null
          full_name?: string | null
          id?: string
          is_creator?: boolean | null
          is_label?: boolean | null
          is_verified?: boolean | null
          logo_url?: string | null
          mailchimp_auto_sync?: boolean | null
          mailchimp_list_id?: string | null
          mailchimp_status?: string | null
          onboarding_completed?: boolean | null
          onboarding_progress?: Json | null
          presskit_url?: string | null
          profile_type?: string | null
          referral_code?: string | null
          referral_rewards_earned?: number | null
          referral_signups_count?: number | null
          slug?: string | null
          updated_at?: string
          user_id: string
          user_type?: Database["public"]["Enums"]["user_type"] | null
          username?: string | null
          verification_note?: string | null
          verification_status?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          cover_image_url?: string | null
          created_at?: string
          discord_guild_id?: string | null
          discord_role_map?: Json | null
          embed_settings?: Json | null
          full_name?: string | null
          id?: string
          is_creator?: boolean | null
          is_label?: boolean | null
          is_verified?: boolean | null
          logo_url?: string | null
          mailchimp_auto_sync?: boolean | null
          mailchimp_list_id?: string | null
          mailchimp_status?: string | null
          onboarding_completed?: boolean | null
          onboarding_progress?: Json | null
          presskit_url?: string | null
          profile_type?: string | null
          referral_code?: string | null
          referral_rewards_earned?: number | null
          referral_signups_count?: number | null
          slug?: string | null
          updated_at?: string
          user_id?: string
          user_type?: Database["public"]["Enums"]["user_type"] | null
          username?: string | null
          verification_note?: string | null
          verification_status?: string | null
        }
        Relationships: []
      }
      project_applications: {
        Row: {
          applicant_id: string
          created_at: string
          id: string
          message: string | null
          project_id: string
          status: string
          updated_at: string
        }
        Insert: {
          applicant_id: string
          created_at?: string
          id?: string
          message?: string | null
          project_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          applicant_id?: string
          created_at?: string
          id?: string
          message?: string | null
          project_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_project_applications_project_id"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "collaboration_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_project_applications_project_id"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "view_hub_collab_briefs"
            referencedColumns: ["id"]
          },
        ]
      }
      purchases: {
        Row: {
          amount: number
          beat_id: string
          buyer_id: string
          commission_amount: number | null
          commission_rate: number | null
          created_at: string
          id: string
          license_pdf_url: string | null
          license_type: string | null
          payout_status: string
          platform_fee_amount: number | null
          producer_amount: number | null
          status: string | null
          stripe_payment_intent_id: string | null
        }
        Insert: {
          amount: number
          beat_id: string
          buyer_id: string
          commission_amount?: number | null
          commission_rate?: number | null
          created_at?: string
          id?: string
          license_pdf_url?: string | null
          license_type?: string | null
          payout_status?: string
          platform_fee_amount?: number | null
          producer_amount?: number | null
          status?: string | null
          stripe_payment_intent_id?: string | null
        }
        Update: {
          amount?: number
          beat_id?: string
          buyer_id?: string
          commission_amount?: number | null
          commission_rate?: number | null
          created_at?: string
          id?: string
          license_pdf_url?: string | null
          license_type?: string | null
          payout_status?: string
          platform_fee_amount?: number | null
          producer_amount?: number | null
          status?: string | null
          stripe_payment_intent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchases_beat_id_fkey"
            columns: ["beat_id"]
            isOneToOne: false
            referencedRelation: "beats"
            referencedColumns: ["id"]
          },
        ]
      }
      quests: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          title: string
          xp: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          title: string
          xp: number
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          title?: string
          xp?: number
        }
        Relationships: []
      }
      quiz_results: {
        Row: {
          answers: Json
          completed_at: string
          course_id: string
          id: string
          lesson_id: string
          max_score: number
          score: number
          user_id: string
        }
        Insert: {
          answers?: Json
          completed_at?: string
          course_id: string
          id?: string
          lesson_id: string
          max_score: number
          score: number
          user_id: string
        }
        Update: {
          answers?: Json
          completed_at?: string
          course_id?: string
          id?: string
          lesson_id?: string
          max_score?: number
          score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_results_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_results_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "view_hub_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      radio_queue: {
        Row: {
          position: number
          track_id: string
        }
        Insert: {
          position: number
          track_id: string
        }
        Update: {
          position?: number
          track_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "radio_queue_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      radio_state: {
        Row: {
          id: string
          listeners: number
          now_track_id: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          listeners?: number
          now_track_id?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          listeners?: number
          now_track_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "radio_state_now_track_id_fkey"
            columns: ["now_track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      release_analytics: {
        Row: {
          created_at: string
          date_recorded: string
          downloads_count: number | null
          id: string
          plays_count: number | null
          release_id: string | null
          revenue_amount: number | null
          unique_listeners: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          date_recorded?: string
          downloads_count?: number | null
          id?: string
          plays_count?: number | null
          release_id?: string | null
          revenue_amount?: number | null
          unique_listeners?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          date_recorded?: string
          downloads_count?: number | null
          id?: string
          plays_count?: number | null
          release_id?: string | null
          revenue_amount?: number | null
          unique_listeners?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "release_analytics_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "releases"
            referencedColumns: ["id"]
          },
        ]
      }
      release_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          parent_comment_id: string | null
          release_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          parent_comment_id?: string | null
          release_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          parent_comment_id?: string | null
          release_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "release_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "release_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "release_comments_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "releases"
            referencedColumns: ["id"]
          },
        ]
      }
      release_credits: {
        Row: {
          contribution_type: string | null
          created_at: string | null
          id: string
          metadata: Json | null
          name: string
          profile_url: string | null
          release_id: string
          role: string
        }
        Insert: {
          contribution_type?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          name: string
          profile_url?: string | null
          release_id: string
          role: string
        }
        Update: {
          contribution_type?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          name?: string
          profile_url?: string | null
          release_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "release_credits_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "releases"
            referencedColumns: ["id"]
          },
        ]
      }
      release_drafts: {
        Row: {
          artist: string | null
          cover_art_url: string | null
          contributors: Json | null
          created_at: string
          description: string | null
          digital_release_date: string | null
          distribution_settings: Json | null
          download_price: number | null
          download_url: string | null
          genre: string | null
          id: string
          minimum_price: number | null
          moderation_notes: string | null
          pay_what_you_want: boolean | null
          preview_url: string | null
          price: number | null
          release_date: string | null
          release_type: string
          status: string
          title: string
          upc_code: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          artist?: string | null
          cover_art_url?: string | null
          contributors?: Json | null
          created_at?: string
          description?: string | null
          digital_release_date?: string | null
          distribution_settings?: Json | null
          download_price?: number | null
          download_url?: string | null
          genre?: string | null
          id?: string
          minimum_price?: number | null
          moderation_notes?: string | null
          pay_what_you_want?: boolean | null
          preview_url?: string | null
          price?: number | null
          release_date?: string | null
          release_type?: string
          status?: string
          title: string
          upc_code?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          artist?: string | null
          cover_art_url?: string | null
          contributors?: Json | null
          created_at?: string
          description?: string | null
          digital_release_date?: string | null
          distribution_settings?: Json | null
          download_price?: number | null
          download_url?: string | null
          genre?: string | null
          id?: string
          minimum_price?: number | null
          moderation_notes?: string | null
          pay_what_you_want?: boolean | null
          preview_url?: string | null
          price?: number | null
          release_date?: string | null
          release_type?: string
          status?: string
          title?: string
          upc_code?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      release_plays: {
        Row: {
          country_code: string | null
          device_type: string | null
          id: string
          play_duration: number | null
          played_at: string
          release_id: string | null
          track_id: string | null
          user_id: string | null
        }
        Insert: {
          country_code?: string | null
          device_type?: string | null
          id?: string
          play_duration?: number | null
          played_at?: string
          release_id?: string | null
          track_id?: string | null
          user_id?: string | null
        }
        Update: {
          country_code?: string | null
          device_type?: string | null
          id?: string
          play_duration?: number | null
          played_at?: string
          release_id?: string | null
          track_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "release_plays_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "releases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "release_plays_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      release_purchases: {
        Row: {
          amount_paid: number
          download_expires_at: string | null
          downloads_used: number | null
          gift_message: string | null
          gift_recipient_email: string | null
          gift_recipient_name: string | null
          id: string
          is_preorder: boolean | null
          last_download_at: string | null
          paid_at: string | null
          purchased_at: string
          receipt_pdf_url: string | null
          release_id: string | null
          status: string
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          available_at: string | null
          user_id: string | null
        }
        Insert: {
          amount_paid: number
          download_expires_at?: string | null
          downloads_used?: number | null
          gift_message?: string | null
          gift_recipient_email?: string | null
          gift_recipient_name?: string | null
          id?: string
          is_preorder?: boolean | null
          last_download_at?: string | null
          paid_at?: string | null
          purchased_at?: string
          receipt_pdf_url?: string | null
          release_id?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          available_at?: string | null
          user_id?: string | null
        }
        Update: {
          amount_paid?: number
          download_expires_at?: string | null
          downloads_used?: number | null
          gift_message?: string | null
          gift_recipient_email?: string | null
          gift_recipient_name?: string | null
          id?: string
          is_preorder?: boolean | null
          last_download_at?: string | null
          paid_at?: string | null
          purchased_at?: string
          receipt_pdf_url?: string | null
          release_id?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          available_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "release_purchases_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "releases"
            referencedColumns: ["id"]
          },
        ]
      }
      release_split_documents: {
        Row: {
          file_name: string
          id: string
          notes: string | null
          release_id: string
          storage_path: string
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          file_name: string
          id?: string
          notes?: string | null
          release_id: string
          storage_path: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          file_name?: string
          id?: string
          notes?: string | null
          release_id?: string
          storage_path?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "release_split_documents_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "releases"
            referencedColumns: ["id"]
          },
        ]
      }
      release_gift_queue: {
        Row: {
          claim_token: string
          claimed_at: string | null
          claimed_by: string | null
          created_at: string
          deliver_at: string | null
          delivered_at: string | null
          gift_message: string | null
          id: string
          purchase_id: string | null
          purchaser_id: string | null
          recipient_email: string
          recipient_name: string | null
          release_id: string
          status: string
        }
        Insert: {
          claim_token?: string
          claimed_at?: string | null
          claimed_by?: string | null
          created_at?: string
          deliver_at?: string | null
          delivered_at?: string | null
          gift_message?: string | null
          id?: string
          purchase_id?: string | null
          purchaser_id?: string | null
          recipient_email: string
          recipient_name?: string | null
          release_id: string
          status?: string
        }
        Update: {
          claim_token?: string
          claimed_at?: string | null
          claimed_by?: string | null
          created_at?: string
          deliver_at?: string | null
          delivered_at?: string | null
          gift_message?: string | null
          id?: string
          purchase_id?: string | null
          purchaser_id?: string | null
          recipient_email?: string
          recipient_name?: string | null
          release_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "release_gift_queue_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "release_purchases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "release_gift_queue_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "releases"
            referencedColumns: ["id"]
          },
        ]
      }
      merch_variants: {
        Row: {
          barcode: string | null
          created_at: string
          id: string
          inventory_quantity: number
          low_stock_threshold: number | null
          option_values: Json
          price_override_cents: number | null
          product_id: string
          sku: string
          updated_at: string
        }
        Insert: {
          barcode?: string | null
          created_at?: string
          id?: string
          inventory_quantity?: number
          low_stock_threshold?: number | null
          option_values?: Json
          price_override_cents?: number | null
          product_id: string
          sku: string
          updated_at?: string
        }
        Update: {
          barcode?: string | null
          created_at?: string
          id?: string
          inventory_quantity?: number
          low_stock_threshold?: number | null
          option_values?: Json
          price_override_cents?: number | null
          product_id?: string
          sku?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "merch_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "store_products"
            referencedColumns: ["id"]
          },
        ]
      }
      merch_inventory_adjustments: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          quantity_delta: number
          reason: string | null
          reference: string | null
          variant_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          quantity_delta: number
          reason?: string | null
          reference?: string | null
          variant_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          quantity_delta?: number
          reason?: string | null
          reference?: string | null
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "merch_inventory_adjustments_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "merch_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      releases: {
        Row: {
          additional_credits: Json | null
          apple_music_url: string | null
          approval_status: string | null
          approved: boolean | null
          artist: string
          allow_gifting?: boolean | null
          allow_gifting: boolean | null
          contributors: Json | null
          composer: string | null
          composers: string[] | null
          cover_art_url: string | null
          created_at: string
          credits_json: Json | null
          description: string | null
          digital_release_date: string | null
          distribution_partner_response: Json | null
          distribution_rights_confirmed: boolean | null
          distribution_settings: Json | null
          distribution_status: string | null
          distribution_submission_ref: string | null
          distributor_provider: string | null
          download_expires_days: number | null
          download_limit: number | null
          download_price: number | null
          download_url: string | null
          dsp_links: Json | null
          enable_direct_sales: boolean | null
          executive_producer: string | null
          explicit: boolean | null
          featured_artist: string | null
          featured_artists: string[] | null
          genre: string | null
          id: string
          is_featured: boolean | null
          is_instrumental: boolean | null
          is_premium_content: boolean | null
          isrc_code: string | null
          label: string | null
          language: string | null
          lyrics: string | null
          mastering_engineer: string | null
          minimum_price: number | null
          mixing_engineer: string | null
          moderation_notes: string | null
          mood_tags: string[] | null
          owner_id: string | null
          owner_type: string | null
          owns_100_percent: boolean | null
          pay_what_you_want: boolean | null
          perk_access: string | null
          presskit_url: string | null
          preview_url: string | null
          price: number | null
          preorder_available_at: string | null
          preorder_enabled: boolean | null
          preorder_inventory: number | null
          primary_genre: string | null
          producer: string | null
          producers: string[] | null
          recording_engineer: string | null
          release_date: string
          release_type: string
          scheduled_publish_date: string | null
          smartlink_slug: string | null
          songwriter: string | null
          songwriters: string[] | null
          soundcloud_url: string | null
          spotify_url: string | null
          spotlight: boolean | null
          status: string | null
          sub_genre: string | null
          title: string
          total_plays: number | null
          total_revenue: number | null
          upc_code: string | null
          updated_at: string
          user_id: string | null
          youtube_url: string | null
          gift_message_template: string | null
        }
        Insert: {
          additional_credits?: Json | null
          apple_music_url?: string | null
          approval_status?: string | null
          approved?: boolean | null
          artist: string
          contributors?: Json | null
          composer?: string | null
          composers?: string[] | null
          cover_art_url?: string | null
          created_at?: string
          credits_json?: Json | null
          description?: string | null
          digital_release_date?: string | null
          distribution_partner_response?: Json | null
          distribution_rights_confirmed?: boolean | null
          distribution_settings?: Json | null
          distribution_status?: string | null
          distribution_submission_ref?: string | null
          distributor_provider?: string | null
          download_expires_days?: number | null
          download_limit?: number | null
          download_price?: number | null
          download_url?: string | null
          dsp_links?: Json | null
          enable_direct_sales?: boolean | null
          executive_producer?: string | null
          explicit?: boolean | null
          featured_artist?: string | null
          featured_artists?: string[] | null
          genre?: string | null
          id?: string
          is_featured?: boolean | null
          is_instrumental?: boolean | null
          is_premium_content?: boolean | null
          isrc_code?: string | null
          label?: string | null
          language?: string | null
          lyrics?: string | null
          mastering_engineer?: string | null
          minimum_price?: number | null
          mixing_engineer?: string | null
          moderation_notes?: string | null
          mood_tags?: string[] | null
          owner_id?: string | null
          owner_type?: string | null
          owns_100_percent?: boolean | null
          pay_what_you_want?: boolean | null
          perk_access?: string | null
          presskit_url?: string | null
          preview_url?: string | null
          price?: number | null
          preorder_available_at?: string | null
          preorder_enabled?: boolean | null
          preorder_inventory?: number | null
          primary_genre?: string | null
          producer?: string | null
          producers?: string[] | null
          recording_engineer?: string | null
          release_date: string
          release_type?: string
          scheduled_publish_date?: string | null
          smartlink_slug?: string | null
          songwriter?: string | null
          songwriters?: string[] | null
          soundcloud_url?: string | null
          spotify_url?: string | null
          spotlight?: boolean | null
          status?: string | null
          sub_genre?: string | null
          title: string
          total_plays?: number | null
          total_revenue?: number | null
          upc_code?: string | null
          updated_at?: string
          user_id?: string | null
          youtube_url?: string | null
          gift_message_template?: string | null
        }
        Update: {
          additional_credits?: Json | null
          apple_music_url?: string | null
          approval_status?: string | null
          approved?: boolean | null
          artist?: string
          allow_gifting?: boolean | null
          contributors?: Json | null
          composer?: string | null
          composers?: string[] | null
          cover_art_url?: string | null
          created_at?: string
          credits_json?: Json | null
          description?: string | null
          digital_release_date?: string | null
          distribution_partner_response?: Json | null
          distribution_rights_confirmed?: boolean | null
          distribution_settings?: Json | null
          distribution_status?: string | null
          distribution_submission_ref?: string | null
          distributor_provider?: string | null
          download_expires_days?: number | null
          download_limit?: number | null
          download_price?: number | null
          download_url?: string | null
          dsp_links?: Json | null
          enable_direct_sales?: boolean | null
          executive_producer?: string | null
          explicit?: boolean | null
          featured_artist?: string | null
          featured_artists?: string[] | null
          genre?: string | null
          id?: string
          is_featured?: boolean | null
          is_instrumental?: boolean | null
          is_premium_content?: boolean | null
          isrc_code?: string | null
          label?: string | null
          language?: string | null
          lyrics?: string | null
          mastering_engineer?: string | null
          minimum_price?: number | null
          mixing_engineer?: string | null
          moderation_notes?: string | null
          mood_tags?: string[] | null
          owner_id?: string | null
          owner_type?: string | null
          owns_100_percent?: boolean | null
          pay_what_you_want?: boolean | null
          perk_access?: string | null
          presskit_url?: string | null
          preview_url?: string | null
          price?: number | null
          preorder_available_at?: string | null
          preorder_enabled?: boolean | null
          preorder_inventory?: number | null
          primary_genre?: string | null
          producer?: string | null
          producers?: string[] | null
          recording_engineer?: string | null
          release_date?: string
          release_type?: string
          scheduled_publish_date?: string | null
          smartlink_slug?: string | null
          songwriter?: string | null
          songwriters?: string[] | null
          soundcloud_url?: string | null
          spotify_url?: string | null
          spotlight?: boolean | null
          status?: string | null
          sub_genre?: string | null
          title?: string
          total_plays?: number | null
          total_revenue?: number | null
          upc_code?: string | null
          updated_at?: string
          user_id?: string | null
          youtube_url?: string | null
          gift_message_template?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "releases_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "releases_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "view_hub_creator_spotlight"
            referencedColumns: ["id"]
          },
        ]
      }
      sample_pack_purchases: {
        Row: {
          amount_paid: number
          download_expires_at: string | null
          download_url: string | null
          id: string
          purchased_at: string
          sample_pack_id: string | null
          stripe_payment_intent_id: string | null
          user_id: string | null
        }
        Insert: {
          amount_paid: number
          download_expires_at?: string | null
          download_url?: string | null
          id?: string
          purchased_at?: string
          sample_pack_id?: string | null
          stripe_payment_intent_id?: string | null
          user_id?: string | null
        }
        Update: {
          amount_paid?: number
          download_expires_at?: string | null
          download_url?: string | null
          id?: string
          purchased_at?: string
          sample_pack_id?: string | null
          stripe_payment_intent_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sample_pack_purchases_sample_pack_id_fkey"
            columns: ["sample_pack_id"]
            isOneToOne: false
            referencedRelation: "sample_packs"
            referencedColumns: ["id"]
          },
        ]
      }
      sample_packs: {
        Row: {
          bpm_range: string | null
          cover_art_url: string | null
          created_at: string
          description: string | null
          download_url: string | null
          genre: string | null
          id: string
          is_featured: boolean | null
          owner_id: string | null
          owner_type: string | null
          preview_url: string | null
          price: number | null
          sample_count: number | null
          tags: string[] | null
          title: string
          total_downloads: number | null
          total_revenue: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bpm_range?: string | null
          cover_art_url?: string | null
          created_at?: string
          description?: string | null
          download_url?: string | null
          genre?: string | null
          id?: string
          is_featured?: boolean | null
          owner_id?: string | null
          owner_type?: string | null
          preview_url?: string | null
          price?: number | null
          sample_count?: number | null
          tags?: string[] | null
          title: string
          total_downloads?: number | null
          total_revenue?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bpm_range?: string | null
          cover_art_url?: string | null
          created_at?: string
          description?: string | null
          download_url?: string | null
          genre?: string | null
          id?: string
          is_featured?: boolean | null
          owner_id?: string | null
          owner_type?: string | null
          preview_url?: string | null
          price?: number | null
          sample_count?: number | null
          tags?: string[] | null
          title?: string
          total_downloads?: number | null
          total_revenue?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      security_audit_log: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: unknown | null
          record_id: string | null
          table_name: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: unknown | null
          record_id?: string | null
          table_name: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: unknown | null
          record_id?: string | null
          table_name?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      session_feedback: {
        Row: {
          content: string | null
          created_at: string
          id: string
          session_id: string
          timecode_seconds: number | null
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          session_id: string
          timecode_seconds?: number | null
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          session_id?: string
          timecode_seconds?: number | null
          user_id?: string
        }
        Relationships: []
      }
      session_files: {
        Row: {
          created_at: string
          file_name: string
          file_type: string | null
          file_url: string
          id: string
          session_id: string
          size: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_type?: string | null
          file_url: string
          id?: string
          session_id: string
          size?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_type?: string | null
          file_url?: string
          id?: string
          session_id?: string
          size?: number | null
          user_id?: string
        }
        Relationships: []
      }
      session_members: {
        Row: {
          id: string
          joined_at: string
          role: string
          session_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          role?: string
          session_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          role?: string
          session_id?: string
          user_id?: string
        }
        Relationships: []
      }
      session_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          session_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          session_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          session_id?: string
          user_id?: string
        }
        Relationships: []
      }
      session_notes: {
        Row: {
          content: string
          created_at: string
          session_id: string
          updated_at: string
          updated_by: string
          user_id: string | null
        }
        Insert: {
          content?: string
          created_at?: string
          session_id: string
          updated_at?: string
          updated_by: string
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          session_id?: string
          updated_at?: string
          updated_by?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "session_notes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_participants: {
        Row: {
          id: string
          joined_at: string
          left_at: string | null
          role: string
          room_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          left_at?: string | null
          role?: string
          room_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          left_at?: string | null
          role?: string
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_participants_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "session_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "session_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "view_hub_creator_spotlight"
            referencedColumns: ["id"]
          },
        ]
      }
      session_rooms: {
        Row: {
          agora_channel_name: string | null
          agora_host_uid: number | null
          agora_last_activity_at: string | null
          agora_last_token_issued_at: string | null
          agora_live_ended_at: string | null
          agora_live_started_at: string | null
          created_at: string
          description: string | null
          ended_at: string | null
          host_id: string
          id: string
          is_public: boolean | null
          status: string
          title: string
        }
        Insert: {
          agora_channel_name?: string | null
          agora_host_uid?: number | null
          agora_last_activity_at?: string | null
          agora_last_token_issued_at?: string | null
          agora_live_ended_at?: string | null
          agora_live_started_at?: string | null
          created_at?: string
          description?: string | null
          ended_at?: string | null
          host_id: string
          id?: string
          is_public?: boolean | null
          status?: string
          title: string
        }
        Update: {
          agora_channel_name?: string | null
          agora_host_uid?: number | null
          agora_last_activity_at?: string | null
          agora_last_token_issued_at?: string | null
          agora_live_ended_at?: string | null
          agora_live_started_at?: string | null
          created_at?: string
          description?: string | null
          ended_at?: string | null
          host_id?: string
          id?: string
          is_public?: boolean | null
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_rooms_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "session_rooms_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "view_hub_creator_spotlight"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          created_at: string
          description: string | null
          host_id: string
          id: string
          is_public: boolean
          scheduled_at: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          host_id: string
          id?: string
          is_public?: boolean
          scheduled_at?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          host_id?: string
          id?: string
          is_public?: boolean
          scheduled_at?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      smartlinks: {
        Row: {
          beat_id: string | null
          created_at: string
          id: string
          is_active: boolean
          release_id: string | null
          slug: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          beat_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          release_id?: string | null
          slug: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          beat_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          release_id?: string | null
          slug?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      social_connections: {
        Row: {
          access_token: string | null
          account_id: string | null
          created_at: string
          display_name: string | null
          expires_at: string | null
          id: string
          provider: string
          refresh_token: string | null
          scopes: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token?: string | null
          account_id?: string | null
          created_at?: string
          display_name?: string | null
          expires_at?: string | null
          id?: string
          provider: string
          refresh_token?: string | null
          scopes?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string | null
          account_id?: string | null
          created_at?: string
          display_name?: string | null
          expires_at?: string | null
          id?: string
          provider?: string
          refresh_token?: string | null
          scopes?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_connections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "social_connections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "view_hub_creator_spotlight"
            referencedColumns: ["id"]
          },
        ]
      }
      social_posts: {
        Row: {
          body: string
          created_at: string
          destinations: string[]
          id: string
          media_paths: string[] | null
          provider_message_ids: Json | null
          scheduled_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          destinations: string[]
          id?: string
          media_paths?: string[] | null
          provider_message_ids?: Json | null
          scheduled_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          destinations?: string[]
          id?: string
          media_paths?: string[] | null
          provider_message_ids?: Json | null
          scheduled_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "social_posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "view_hub_creator_spotlight"
            referencedColumns: ["id"]
          },
        ]
      }
      splits: {
        Row: {
          collaborator_id: string | null
          created_at: string | null
          description: string | null
          id: string
          percentage: number
          release_id: string | null
          split_type: string
          track_id: string | null
          updated_at: string | null
        }
        Insert: {
          collaborator_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          percentage: number
          release_id?: string | null
          split_type: string
          track_id?: string | null
          updated_at?: string | null
        }
        Update: {
          collaborator_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          percentage?: number
          release_id?: string | null
          split_type?: string
          track_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "splits_collaborator_id_fkey"
            columns: ["collaborator_id"]
            isOneToOne: false
            referencedRelation: "collaborators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "splits_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "releases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "splits_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      store_product_items: {
        Row: {
          bundle_product_id: string
          item_id: string
          item_type: string
          qty: number | null
        }
        Insert: {
          bundle_product_id: string
          item_id: string
          item_type: string
          qty?: number | null
        }
        Update: {
          bundle_product_id?: string
          item_id?: string
          item_type?: string
          qty?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "store_product_items_bundle_product_id_fkey"
            columns: ["bundle_product_id"]
            isOneToOne: false
            referencedRelation: "store_products"
            referencedColumns: ["id"]
          },
        ]
      }
      store_products: {
        Row: {
          bundle: boolean | null
          created_at: string
          description: string | null
          download_url: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          price: number
          product_type: string
          stock_quantity: number | null
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          bundle?: boolean | null
          created_at?: string
          description?: string | null
          download_url?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          price: number
          product_type: string
          stock_quantity?: number | null
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          bundle?: boolean | null
          created_at?: string
          description?: string | null
          download_url?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          price?: number
          product_type?: string
          stock_quantity?: number | null
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      streaming_sessions: {
        Row: {
          device_info: Json | null
          quality_settings: Json | null
          session_start: string | null
          total_duration: number | null
          total_tracks_played: number | null
          unique_tracks: number | null
          user_id: string | null
        }
        Insert: {
          device_info?: Json | null
          quality_settings?: Json | null
          session_start?: string | null
          total_duration?: number | null
          total_tracks_played?: number | null
          unique_tracks?: number | null
          user_id?: string | null
        }
        Update: {
          device_info?: Json | null
          quality_settings?: Json | null
          session_start?: string | null
          total_duration?: number | null
          total_tracks_played?: number | null
          unique_tracks?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      track_analytics: {
        Row: {
          artist_analytics_id: string
          comments: number | null
          created_at: string
          date_recorded: string
          id: string
          likes: number | null
          shares: number | null
          streams: number | null
          track_id: string
          track_name: string
          updated_at: string
          views: number | null
        }
        Insert: {
          artist_analytics_id: string
          comments?: number | null
          created_at?: string
          date_recorded?: string
          id?: string
          likes?: number | null
          shares?: number | null
          streams?: number | null
          track_id: string
          track_name: string
          updated_at?: string
          views?: number | null
        }
        Update: {
          artist_analytics_id?: string
          comments?: number | null
          created_at?: string
          date_recorded?: string
          id?: string
          likes?: number | null
          shares?: number | null
          streams?: number | null
          track_id?: string
          track_name?: string
          updated_at?: string
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "track_analytics_artist_analytics_id_fkey"
            columns: ["artist_analytics_id"]
            isOneToOne: false
            referencedRelation: "artist_analytics"
            referencedColumns: ["id"]
          },
        ]
      }
      tracks: {
        Row: {
          additional_credits: Json | null
          audio_url: string
          composer: string | null
          composers: string[] | null
          created_at: string
          distribution_rights_confirmed: boolean | null
          duration: number | null
          featured_artists: string[] | null
          id: string
          isrc_code: string | null
          owner_id: string | null
          owner_type: string | null
          owns_100_percent: boolean | null
          producer: string | null
          producers: string[] | null
          release_draft_id: string | null
          release_id: string
          songwriter: string | null
          songwriters: string[] | null
          title: string
          track_number: number
          updated_at: string
        }
        Insert: {
          additional_credits?: Json | null
          audio_url: string
          composer?: string | null
          composers?: string[] | null
          created_at?: string
          distribution_rights_confirmed?: boolean | null
          duration?: number | null
          featured_artists?: string[] | null
          id?: string
          isrc_code?: string | null
          owner_id?: string | null
          owner_type?: string | null
          owns_100_percent?: boolean | null
          producer?: string | null
          producers?: string[] | null
          release_draft_id?: string | null
          release_id: string
          songwriter?: string | null
          songwriters?: string[] | null
          title: string
          track_number: number
          updated_at?: string
        }
        Update: {
          additional_credits?: Json | null
          audio_url?: string
          composer?: string | null
          composers?: string[] | null
          created_at?: string
          distribution_rights_confirmed?: boolean | null
          duration?: number | null
          featured_artists?: string[] | null
          id?: string
          isrc_code?: string | null
          owner_id?: string | null
          owner_type?: string | null
          owns_100_percent?: boolean | null
          producer?: string | null
          producers?: string[] | null
          release_draft_id?: string | null
          release_id?: string
          songwriter?: string | null
          songwriters?: string[] | null
          title?: string
          track_number?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tracks_release_draft_id_fkey"
            columns: ["release_draft_id"]
            isOneToOne: false
            referencedRelation: "release_drafts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tracks_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "releases"
            referencedColumns: ["id"]
          },
        ]
      }
      unified_inbox: {
        Row: {
          author_handle: string | null
          author_name: string | null
          created_at: string
          id: string
          is_read: boolean
          is_starred: boolean
          message_id: string | null
          permalink: string | null
          provider: string
          snippet: string | null
          thread_id: string | null
          user_id: string
        }
        Insert: {
          author_handle?: string | null
          author_name?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          is_starred?: boolean
          message_id?: string | null
          permalink?: string | null
          provider: string
          snippet?: string | null
          thread_id?: string | null
          user_id: string
        }
        Update: {
          author_handle?: string | null
          author_name?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          is_starred?: boolean
          message_id?: string | null
          permalink?: string | null
          provider?: string
          snippet?: string | null
          thread_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "unified_inbox_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "unified_inbox_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "view_hub_creator_spotlight"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          achievement_name: string
          achievement_type: string
          created_at: string
          description: string | null
          id: string
          points_awarded: number | null
          unlocked_at: string
          user_id: string
        }
        Insert: {
          achievement_name: string
          achievement_type: string
          created_at?: string
          description?: string | null
          id?: string
          points_awarded?: number | null
          unlocked_at?: string
          user_id: string
        }
        Update: {
          achievement_name?: string
          achievement_type?: string
          created_at?: string
          description?: string | null
          id?: string
          points_awarded?: number | null
          unlocked_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_course_progress: {
        Row: {
          completed_at: string | null
          completion_percentage: number | null
          course_id: string
          created_at: string
          id: string
          last_accessed_at: string | null
          progress_data: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          completion_percentage?: number | null
          course_id: string
          created_at?: string
          id?: string
          last_accessed_at?: string | null
          progress_data?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          completion_percentage?: number | null
          course_id?: string
          created_at?: string
          id?: string
          last_accessed_at?: string | null
          progress_data?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_course_progress_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_course_progress_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "view_hub_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      user_discounts: {
        Row: {
          created_at: string | null
          creator_id: string
          discount_percent: number
          discount_type: string
          expires_at: string
          id: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          creator_id: string
          discount_percent: number
          discount_type: string
          expires_at: string
          id?: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          creator_id?: string
          discount_percent?: number
          discount_type?: string
          expires_at?: string
          id?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_file_quotas: {
        Row: {
          created_at: string
          id: string
          last_reset_date: string | null
          monthly_uploads_count: number | null
          monthly_uploads_size: number | null
          total_storage_used: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_reset_date?: string | null
          monthly_uploads_count?: number | null
          monthly_uploads_size?: number | null
          total_storage_used?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_reset_date?: string | null
          monthly_uploads_count?: number | null
          monthly_uploads_size?: number | null
          total_storage_used?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          locale_settings: Json | null
          user_id: string
        }
        Insert: {
          locale_settings?: Json | null
          user_id: string
        }
        Update: {
          locale_settings?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      user_quest_progress: {
        Row: {
          completed_at: string | null
          id: string
          quest_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          id?: string
          quest_id: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          id?: string
          quest_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_quest_progress_quest_id_fkey"
            columns: ["quest_id"]
            isOneToOne: false
            referencedRelation: "quests"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_stats: {
        Row: {
          beats_purchased: number | null
          beats_sold: number | null
          beats_uploaded: number | null
          collaborations_completed: number | null
          created_at: string
          current_streak: number | null
          days_active: number | null
          id: string
          last_active_date: string | null
          level: number | null
          longest_streak: number | null
          total_points: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          beats_purchased?: number | null
          beats_sold?: number | null
          beats_uploaded?: number | null
          collaborations_completed?: number | null
          created_at?: string
          current_streak?: number | null
          days_active?: number | null
          id?: string
          last_active_date?: string | null
          level?: number | null
          longest_streak?: number | null
          total_points?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          beats_purchased?: number | null
          beats_sold?: number | null
          beats_uploaded?: number | null
          collaborations_completed?: number | null
          created_at?: string
          current_streak?: number | null
          days_active?: number | null
          id?: string
          last_active_date?: string | null
          level?: number | null
          longest_streak?: number | null
          total_points?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          billing_cycle: string | null
          commission_rate: number | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          status: string | null
          stripe_subscription_id: string | null
          tier: Database["public"]["Enums"]["subscription_tier"]
          updated_at: string
          user_id: string
        }
        Insert: {
          billing_cycle?: string | null
          commission_rate?: number | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          status?: string | null
          stripe_subscription_id?: string | null
          tier?: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string
          user_id: string
        }
        Update: {
          billing_cycle?: string | null
          commission_rate?: number | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          status?: string | null
          stripe_subscription_id?: string | null
          tier?: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_usage: {
        Row: {
          active_courses: number | null
          beats_uploaded_month: number | null
          beats_uploaded_total: number | null
          created_at: string
          feedback_submissions_month: number | null
          id: string
          last_reset_date: string | null
          projects_posted_month: number | null
          tool_usage_today: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          active_courses?: number | null
          beats_uploaded_month?: number | null
          beats_uploaded_total?: number | null
          created_at?: string
          feedback_submissions_month?: number | null
          id?: string
          last_reset_date?: string | null
          projects_posted_month?: number | null
          tool_usage_today?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          active_courses?: number | null
          beats_uploaded_month?: number | null
          beats_uploaded_total?: number | null
          created_at?: string
          feedback_submissions_month?: number | null
          id?: string
          last_reset_date?: string | null
          projects_posted_month?: number | null
          tool_usage_today?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      videos: {
        Row: {
          artist_id: string | null
          created_at: string
          description: string | null
          id: string
          is_featured: boolean | null
          thumbnail_url: string | null
          title: string
          updated_at: string
          youtube_url: string
        }
        Insert: {
          artist_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_featured?: boolean | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          youtube_url: string
        }
        Update: {
          artist_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_featured?: boolean | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          youtube_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "videos_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_ledger: {
        Row: {
          amount_credits: number
          counterparty_user_id: string | null
          created_at: string
          id: string
          kind: string
          meta: Json | null
          ref_id: string | null
          ref_type: string | null
          user_id: string
        }
        Insert: {
          amount_credits: number
          counterparty_user_id?: string | null
          created_at?: string
          id?: string
          kind: string
          meta?: Json | null
          ref_id?: string | null
          ref_type?: string | null
          user_id: string
        }
        Update: {
          amount_credits?: number
          counterparty_user_id?: string | null
          created_at?: string
          id?: string
          kind?: string
          meta?: Json | null
          ref_id?: string | null
          ref_type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      web_push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      webhook_deliveries: {
        Row: {
          attempt_count: number
          created_at: string
          delivered_at: string | null
          endpoint_id: string
          event_type: string
          id: string
          last_error: string | null
          payload_json: Json
          status: string
        }
        Insert: {
          attempt_count?: number
          created_at?: string
          delivered_at?: string | null
          endpoint_id: string
          event_type: string
          id?: string
          last_error?: string | null
          payload_json: Json
          status?: string
        }
        Update: {
          attempt_count?: number
          created_at?: string
          delivered_at?: string | null
          endpoint_id?: string
          event_type?: string
          id?: string
          last_error?: string | null
          payload_json?: Json
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_deliveries_endpoint_id_fkey"
            columns: ["endpoint_id"]
            isOneToOne: false
            referencedRelation: "webhook_endpoints"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_endpoints: {
        Row: {
          created_at: string
          events: string[]
          id: string
          is_active: boolean
          secret: string
          updated_at: string
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          events?: string[]
          id?: string
          is_active?: boolean
          secret: string
          updated_at?: string
          url: string
          user_id: string
        }
        Update: {
          created_at?: string
          events?: string[]
          id?: string
          is_active?: boolean
          secret?: string
          updated_at?: string
          url?: string
          user_id?: string
        }
        Relationships: []
      }
      wishlists: {
        Row: {
          created_at: string
          id: string
          product_id: string
          product_title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          product_title: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          product_title?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      live_gift_room_totals: {
        Row: {
          events_count: number | null
          room_id: string | null
          total_credits: number | null
          total_quantity: number | null
        }
        Relationships: [
          {
            foreignKeyName: "live_gift_events_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "session_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      v_trending_content: {
        Row: {
          content_id: string | null
          content_type: string | null
          created_at: string | null
          rank: number | null
          title: string | null
          total_score: number | null
          user_id: string | null
        }
        Relationships: []
      }
      v_wallet_balances: {
        Row: {
          balance_credits: number | null
          pending_credits: number | null
          user_id: string | null
        }
        Relationships: []
      }
      view_hub_collab_briefs: {
        Row: {
          author: Json | null
          budget: string | null
          genre: string | null
          id: string | null
          skill: string | null
          slug: string | null
          title: string | null
        }
        Relationships: []
      }
      view_hub_contests: {
        Row: {
          cover: string | null
          ends_at: string | null
          entrants: number | null
          id: string | null
          slug: string | null
          title: string | null
        }
        Insert: {
          cover?: string | null
          ends_at?: string | null
          entrants?: never
          id?: string | null
          slug?: never
          title?: string | null
        }
        Update: {
          cover?: string | null
          ends_at?: string | null
          entrants?: never
          id?: string | null
          slug?: never
          title?: string | null
        }
        Relationships: []
      }
      view_hub_courses: {
        Row: {
          cover: string | null
          id: string | null
          instructor: string | null
          length: string | null
          level: string | null
          slug: string | null
          title: string | null
        }
        Relationships: []
      }
      view_hub_creator_spotlight: {
        Row: {
          avatar: string | null
          bio: string | null
          cover: string | null
          featured_track: Json | null
          followers: number | null
          genres: string[] | null
          id: string | null
          name: string | null
          slug: string | null
          stats: Json | null
        }
        Relationships: []
      }
      view_hub_events: {
        Row: {
          cover: string | null
          host: string | null
          id: string | null
          is_live: boolean | null
          start_at: string | null
          title: string | null
          url: string | null
          viewers: number | null
        }
        Relationships: []
      }
      view_hub_events_core: {
        Row: {
          cover: string | null
          host: string | null
          id: string | null
          is_live: boolean | null
          start_at: string | null
          title: string | null
          url: string | null
          viewers: number | null
        }
        Relationships: []
      }
      view_hub_members_top: {
        Row: {
          avatar: string | null
          badges: string[] | null
          id: string | null
          role: string | null
          score: number | null
          username: string | null
        }
        Relationships: []
      }
      view_hub_threads: {
        Row: {
          author: Json | null
          id: string | null
          reply_count: number | null
          slug: string | null
          tag: string | null
          title: string | null
          updated_at: string | null
        }
        Relationships: []
      }
      view_hub_trending: {
        Row: {
          count: number | null
          tag: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _normalize_owner_type: {
        Args: { p: string }
        Returns: string
      }
      _set_search_path: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      accept_artist_link: {
        Args: { p_link_id: string }
        Returns: {
          link_id: string
          status: Database["public"]["Enums"]["managed_profile_status"]
        }[]
      }
      accept_label_invite: {
        Args: { p_token: string }
        Returns: {
          label_id: string
          role: string
        }[]
      }
      accept_ownership_transfer: {
        Args: { p_token: string }
        Returns: {
          label_id: string
          new_owner_user_id: string
        }[]
      }
      admin_create_managed_label: {
        Args: {
          p_contact_email?: string
          p_country?: string
          p_cover_image_url?: string
          p_logo_url?: string
          p_name: string
          p_owner_email?: string
          p_slug: string
        }
        Returns: {
          claim_token: string
          label_id: string
        }[]
      }
      admin_delete_label: {
        Args: { p_label_id: string }
        Returns: undefined
      }
      award_quest_xp: {
        Args: { p_user_id: string; p_xp_amount: number }
        Returns: undefined
      }
      can_access_release: {
        Args: { p_release_id: string; p_user_id: string }
        Returns: boolean
      }
      can_access_session: {
        Args: { p_session_id: string; p_user_id: string }
        Returns: boolean
      }
      check_and_award_badges: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      check_content_access: {
        Args: {
          p_content_id: string
          p_content_type: string
          p_user_id: string
        }
        Returns: boolean
      }
      claim_admin_created_profile: {
        Args: { p_token: string }
        Returns: {
          label_id: string
        }[]
      }
      claim_label_by_slug: {
        Args: { p_slug: string }
        Returns: {
          ensured_membership: boolean
          label_id: string
          owner_user_id: string
        }[]
      }
      create_label_for_current_user: {
        Args: {
          p_contact_email: string
          p_country: string
          p_cover_image_url: string
          p_genre: string
          p_logo_url: string
          p_name: string
          p_slug: string
        }
        Returns: string
      }
      create_moderation_item: {
        Args: {
          p_item_id: string
          p_item_type: string
          p_reason?: string
          p_severity?: string
        }
        Returns: string
      }
      create_payout_batch: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      crowdfunding_mark_supporter_fulfilled: {
        Args: { p_supporter_entry: string; p_note?: string | null }
        Returns: Database['public']['Tables']['campaign_supporters']['Row']
      }
      crowdfunding_publish_campaign: {
        Args: { p_campaign_id: string; p_go_live?: boolean | null; p_note?: string | null }
        Returns: Database['public']['Tables']['campaigns']['Row']
      }
      crowdfunding_refund_supporter: {
        Args: {
          p_supporter_entry: string
          p_reason?: string | null
          p_refund_cents?: number | null
        }
        Returns: Database['public']['Tables']['campaign_supporters']['Row']
      }
      delete_label_as_owner: {
        Args: { p_label_id: string }
        Returns: undefined
      }
      delete_labels_by_slug: {
        Args: { p_slugs: string[] }
        Returns: number
      }
      first_label_slug_for_current_user: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      fn_hub_payload: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      fn_hub_stats: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      generate_course_certificate: {
        Args: { p_course_id: string; p_user_id: string }
        Returns: string
      }
      get_beat_collaborators_safe: {
        Args: { p_beat_id: string }
        Returns: {
          beat_id: string
          collaborator_email: string
          collaborator_name: string
          collaborator_user_id: string
          content_id_percentage: number
          created_at: string
          id: string
          is_confirmed: boolean
          profit_share_percentage: number
          publishing_share_percentage: number
          role: string
          updated_at: string
        }[]
      }
      get_content_by_owner: {
        Args: {
          p_content_type?: string
          p_limit?: number
          p_offset?: number
          p_owner_id: string
          p_owner_type: string
        }
        Returns: {
          content_id: string
          content_type: string
          created_at: string
          is_gated: boolean
          stats: Json
          title: string
        }[]
      }
      get_content_split_status: {
        Args: { p_content_id: string; p_content_type: string }
        Returns: string
      }
      get_crm_contacts: {
        Args: { p_creator_id?: string }
        Returns: {
          contact_id: string
          email: string | null
          username: string | null
          full_name: string | null
          sources: string[] | null
          total_spend: number | null
          lifetime_value: number | null
          last_interaction: string | null
          first_interaction: string | null
          order_count: number | null
          follower_since: string | null
          membership_status: string | null
          membership_value: number | null
          membership_since: string | null
          student_value: number | null
          student_since: string | null
        }[]
      }
      get_current_user_labels: {
        Args: Record<PropertyKey, never>
        Returns: {
          cover_image_url: string
          created_at: string
          id: string
          logo_url: string
          name: string
          role: string
          slug: string
        }[]
      }
      get_label_invitation_details: {
        Args: { p_token: string }
        Returns: {
          current_member_role: string
          expires_at: string
          invitation_id: string
          invited_by_name: string
          is_member: boolean
          label_id: string
          label_name: string
          label_slug: string
          role: string
        }[]
      }
      get_orders_for_user: {
        Args: {
          p_limit?: number
          p_offset?: number
          p_order_id?: string
          p_user_id: string
        }
        Returns: {
          created_at: string
          currency: string
          item_count: number
          items: Json
          order_id: string
          paid_at: string
          payment_provider: string
          shipping_address: Json
          status: string
          total_amount: number
        }[]
      }
      get_producer_earnings_summary: {
        Args: { p_producer_id: string }
        Returns: Json
      }
      get_producer_pending_earnings: {
        Args: { p_producer_id: string }
        Returns: number
      }
      get_release_analytics: {
        Args: { p_days?: number; p_release_id?: string; p_user_id: string }
        Returns: Json
      }
      get_user_file_limits: {
        Args: { p_user_id: string }
        Returns: Json
      }
      get_user_memberships: {
        Args: { p_user_id: string }
        Returns: {
          expires_at: string
          membership_id: string
          owner_id: string
          owner_name: string
          owner_type: string
          perks: Json
          status: string
          tier_id: string
          tier_name: string
          tier_order: number
        }[]
      }
      get_user_playlist_ids: {
        Args: { p_user_id: string }
        Returns: {
          playlist_id: string
        }[]
      }
      get_user_session_role: {
        Args: { p_session_id: string; p_user_id: string }
        Returns: string
      }
      get_user_tier: {
        Args: { user_id: string }
        Returns: Database["public"]["Enums"]["subscription_tier"]
      }
      get_user_tier_limits: {
        Args: { user_id: string }
        Returns: Json
      }
      get_wallet_balance: {
        Args: { p_user_id: string }
        Returns: Json
      }
      has_course_access: {
        Args: { p_course_id: string; p_user_id: string }
        Returns: boolean
      }
      has_label_membership: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      has_purchased_release: {
        Args: { p_release_id: string; p_user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["user_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_user_usage: {
        Args: { p_usage_type: string; p_user_id: string }
        Returns: undefined
      }
      invite_label_member: {
        Args: {
          p_email: string
          p_label_id: string
          p_role: Database["public"]["Enums"]["label_member_role"]
        }
        Returns: {
          expires_at: string
          invitation_id: string
          token: string
        }[]
      }
      is_label_admin: {
        Args: { p_label_id: string }
        Returns: boolean
      }
      is_label_member: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_payout_eligible: {
        Args: { p_producer_id: string }
        Returns: boolean
      }
      is_playlist_collaborator: {
        Args: { p_playlist_id: string; p_user_id: string }
        Returns: boolean
      }
      label_basic_by_slug: {
        Args: { p_slug: string }
        Returns: {
          cover_image_url: string
          created_at: string
          id: string
          logo_url: string
          name: string
          role: string
          slug: string
        }[]
      }
      label_pending_invites: {
        Args: { p_label_id: string }
        Returns: {
          created_at: string
          email: string
          expires_at: string
          invitation_id: string
          invite_role: string
          invited_by: string
          token: string
        }[]
      }
      label_roster: {
        Args: { p_label_id: string }
        Returns: {
          avatar_url: string
          full_name: string
          joined_at: string
          member_role: string
          member_user_id: string
          username: string
        }[]
      }
      log_sensitive_access: {
        Args: { p_action: string; p_record_id?: string; p_table_name: string }
        Returns: undefined
      }
      log_system_event: {
        Args: {
          p_action: string
          p_component: string
          p_level: number
          p_message: string
          p_metadata?: Json
          p_user_id?: string
        }
        Returns: undefined
      }
      mark_all_notifications_read: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      mark_notification_read: {
        Args: { p_id: string; p_user_id: string }
        Returns: undefined
      }
      perform_live_gift: {
        Args: {
          p_animation_variant?: string
          p_gift_id: string
          p_message?: string
          p_quantity?: number
          p_room_id: string
          p_sender: string
        }
        Returns: string
      }
      process_tip_payment: {
        Args: {
          p_amount_credits: number
          p_creator_id: string
          p_payment_method?: string
        }
        Returns: Json
      }
      refresh_crm_segment: {
        Args: { p_segment_id: string }
        Returns: undefined
      }
      refresh_due_crm_segments: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      request_artist_link: {
        Args:
          | { p_creator_profile_id: string; p_label_id: string }
          | {
              p_creator_profile_id: string
              p_label_id: string
              p_role?: Database["public"]["Enums"]["managed_profile_role"]
            }
        Returns: {
          link_id: string
          status: string
        }[]
      }
      request_label_action: {
        Args: { p_action: string; p_label_id: string; p_payload?: Json }
        Returns: {
          action: string
          request_id: string
        }[]
      }
      request_ownership_transfer: {
        Args: { p_label_id: string; p_to_email?: string; p_to_user_id?: string }
        Returns: {
          expires_at: string
          token: string
          transfer_id: string
        }[]
      }
      resend_label_invite: {
        Args: { p_invitation_id: string }
        Returns: {
          expires_at: string
          token: string
        }[]
      }
      revoke_label_invite: {
        Args: { p_invitation_id: string }
        Returns: undefined
      }
      slugify: {
        Args: { txt: string }
        Returns: string
      }
      switch_content_owner: {
        Args: {
          p_id: string
          p_table: unknown
          p_to_owner_id: string
          p_to_owner_type: string
        }
        Returns: undefined
      }
      transfer_content_ownership: {
        Args: {
          p_content_id: string
          p_content_type: string
          p_new_owner_id: string
          p_new_owner_type: string
        }
        Returns: boolean
      }
      unlink_artist_from_label: {
        Args: { p_creator_profile_id: string; p_label_id: string }
        Returns: undefined
      }
      update_file_quotas: {
        Args: { p_file_size: number; p_user_id: string }
        Returns: undefined
      }
      validate_analytics_consistency: {
        Args: Record<PropertyKey, never>
        Returns: {
          actual_plays: number
          analytics_plays: number
          is_consistent: boolean
          release_id: string
          total_plays_column: number
        }[]
      }
      validate_contact_submission: {
        Args: { p_email: string; p_ip_address?: unknown }
        Returns: boolean
      }
      validate_mailing_list_submission: {
        Args: { p_email: string; p_ip_address?: unknown }
        Returns: boolean
      }
    }
    Enums: {
      automation_type: "scheduled_post" | "auto_reply" | "smart_drop"
      campaign_status:
        | "draft"
        | "reviewing"
        | "live"
        | "success"
        | "failed"
        | "fulfilled"
      campaign_supporter_status:
        | "pledged"
        | "refunded"
        | "fulfilled"
        | "cancelled"
      billing_period: "monthly" | "yearly" | "lifetime"
      content_gate_type: "tier_or_higher" | "specific_tier" | "any_tier"
      label_delete_type: "downgrade" | "delete"
      label_deletion_type: "downgrade" | "delete"
      label_member_role: "owner" | "admin" | "editor" | "viewer"
      label_role: "owner" | "admin" | "editor" | "viewer"
      managed_profile_role: "primary" | "distribution_only"
      managed_profile_status: "pending" | "active" | "removed"
      membership_status: "active" | "cancelled" | "expired" | "past_due"
      perk_type:
        | "discord_role"
        | "early_access"
        | "exclusive_content"
        | "download_access"
        | "merch_discount"
        | "livestream_access"
        | "custom_badge"
        | "shoutout"
        | "behind_the_scenes"
      submission_status: "pending" | "approved" | "rejected"
      subscription_tier: "free" | "creator" | "pro"
      tier_status: "draft" | "active" | "paused" | "archived"
      transaction_type: "entry" | "payout"
      user_role: "user" | "admin" | "moderator"
      user_type: "artist" | "producer" | "industry"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      automation_type: ["scheduled_post", "auto_reply", "smart_drop"],
      billing_period: ["monthly", "yearly", "lifetime"],
      content_gate_type: ["tier_or_higher", "specific_tier", "any_tier"],
      label_delete_type: ["downgrade", "delete"],
      label_deletion_type: ["downgrade", "delete"],
      label_member_role: ["owner", "admin", "editor", "viewer"],
      label_role: ["owner", "admin", "editor", "viewer"],
      managed_profile_role: ["primary", "distribution_only"],
      managed_profile_status: ["pending", "active", "removed"],
      membership_status: ["active", "cancelled", "expired", "past_due"],
      perk_type: [
        "discord_role",
        "early_access",
        "exclusive_content",
        "download_access",
        "merch_discount",
        "livestream_access",
        "custom_badge",
        "shoutout",
        "behind_the_scenes",
      ],
      submission_status: ["pending", "approved", "rejected"],
      subscription_tier: ["free", "creator", "pro"],
      tier_status: ["draft", "active", "paused", "archived"],
      transaction_type: ["entry", "payout"],
      user_role: ["user", "admin", "moderator"],
      user_type: ["artist", "producer", "industry"],
    },
  },
} as const
