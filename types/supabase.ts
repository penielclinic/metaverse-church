export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'youth' | 'cell_leader' | 'youth_pastor' | 'pastor'
export type ChallengeType = 'attendance' | 'devotion' | 'prayer' | 'cell' | 'mission' | 'share'
export type BadgeRarity = 'common' | 'rare' | 'epic' | 'legendary'

export type Database = {
  public: {
    Tables: {
      // ── 001_profiles ──────────────────────────────────────────
      profiles: {
        Row: {
          id: string
          name: string
          phone: string | null
          role: UserRole
          cell_id: number | null
          mission_id: number | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          name: string
          phone?: string | null
          role?: UserRole
          cell_id?: number | null
          mission_id?: number | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
        Relationships: []
      }

      // ── 002_avatars ───────────────────────────────────────────
      avatars: {
        Row: {
          id: string
          user_id: string
          skin_tone: 'light' | 'medium' | 'tan' | 'dark'
          hair_style: 'short' | 'long' | 'curly' | 'bald' | 'ponytail'
          outfit: 'casual' | 'formal' | 'hanbok' | 'worship_team' | 'pastor'
          active_badge: string | null
          level: number
          exp: number
          glow_color: string | null
          devotion_streak: number
          last_devotion_date: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          skin_tone?: 'light' | 'medium' | 'tan' | 'dark'
          hair_style?: 'short' | 'long' | 'curly' | 'bald' | 'ponytail'
          outfit?: 'casual' | 'formal' | 'hanbok' | 'worship_team' | 'pastor'
          active_badge?: string | null
          level?: number
          exp?: number
          glow_color?: string | null
          devotion_streak?: number
          last_devotion_date?: string | null
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['avatars']['Insert']>
        Relationships: []
      }

      // ── 003_cells ─────────────────────────────────────────────
      missions: {
        Row: {
          id: number
          name: string
          leader_id: string | null
          description: string | null
          created_at: string
        }
        Insert: {
          id?: number
          name: string
          leader_id?: string | null
          description?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['missions']['Insert']>
        Relationships: []
      }
      cells: {
        Row: {
          id: number
          name: string
          leader_id: string | null
          mission_id: number | null
          description: string | null
          created_at: string
        }
        Insert: {
          id?: number
          name: string
          leader_id?: string | null
          mission_id?: number | null
          description?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['cells']['Insert']>
        Relationships: []
      }

      // ── 004_challenge_system ──────────────────────────────────
      badge_definitions: {
        Row: {
          id: number
          slug: string
          name: string
          description: string
          icon_url: string | null
          rarity: BadgeRarity
          created_at: string
        }
        Insert: {
          id?: number
          slug: string
          name: string
          description: string
          icon_url?: string | null
          rarity?: BadgeRarity
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['badge_definitions']['Insert']>
        Relationships: []
      }
      user_badges: {
        Row: {
          id: number
          user_id: string
          badge_id: number
          earned_at: string
        }
        Insert: {
          id?: number
          user_id: string
          badge_id: number
          earned_at?: string
        }
        Update: Partial<Database['public']['Tables']['user_badges']['Insert']>
        Relationships: []
      }
      challenges: {
        Row: {
          id: number
          slug: string
          name: string
          description: string
          type: ChallengeType
          target_count: number
          badge_id: number | null
          exp_reward: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: number
          slug: string
          name: string
          description: string
          type: ChallengeType
          target_count?: number
          badge_id?: number | null
          exp_reward?: number
          is_active?: boolean
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['challenges']['Insert']>
        Relationships: []
      }
      challenge_logs: {
        Row: {
          id: number
          user_id: string
          challenge_id: number
          progress: number
          completed: boolean
          completed_at: string | null
          updated_at: string
        }
        Insert: {
          id?: number
          user_id: string
          challenge_id: number
          progress?: number
          completed?: boolean
          completed_at?: string | null
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['challenge_logs']['Insert']>
        Relationships: []
      }
      streaks: {
        Row: {
          id: number
          user_id: string
          current_streak: number
          longest_streak: number
          last_activity: string | null
          updated_at: string
        }
        Insert: {
          id?: number
          user_id: string
          current_streak?: number
          longest_streak?: number
          last_activity?: string | null
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['streaks']['Insert']>
        Relationships: []
      }

      // ── 005_devotion ──────────────────────────────────────────
      devotion_logs: {
        Row: {
          id: number
          user_id: string
          logged_date: string
          bible_ref: string | null
          content: string | null
          image_url: string | null
          is_public: boolean
          created_at: string
        }
        Insert: {
          id?: number
          user_id: string
          logged_date?: string
          bible_ref?: string | null
          content?: string | null
          image_url?: string | null
          is_public?: boolean
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['devotion_logs']['Insert']>
        Relationships: []
      }
      sermons: {
        Row: {
          id: number
          title: string
          preacher: string
          preached_at: string
          bible_ref: string | null
          youtube_id: string | null
          summary: string | null
          full_text: string | null
          is_published: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          title: string
          preacher?: string
          preached_at: string
          bible_ref?: string | null
          youtube_id?: string | null
          summary?: string | null
          full_text?: string | null
          is_published?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['sermons']['Insert']>
        Relationships: []
      }

      // ── 006_prayer_notes ──────────────────────────────────────
      prayer_notes: {
        Row: {
          id: number
          user_id: string
          content: string
          is_anonymous: boolean
          amen_count: number
          pos_x: number
          pos_y: number
          color: 'yellow' | 'pink' | 'blue' | 'green' | 'purple'
          is_answered: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          user_id: string
          content: string
          is_anonymous?: boolean
          amen_count?: number
          pos_x?: number
          pos_y?: number
          color?: 'yellow' | 'pink' | 'blue' | 'green' | 'purple'
          is_answered?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['prayer_notes']['Insert']>
        Relationships: []
      }
      prayer_amens: {
        Row: {
          id: number
          note_id: number
          user_id: string
          created_at: string
        }
        Insert: {
          id?: number
          note_id: number
          user_id: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['prayer_amens']['Insert']>
        Relationships: []
      }

      // ── 007_counsel ───────────────────────────────────────────
      counsel_posts: {
        Row: {
          id: number
          user_id: string
          title: string
          content: string
          category: 'family' | 'faith' | 'relationship' | 'career' | 'health' | 'general'
          is_anonymous: boolean
          status: 'open' | 'in_progress' | 'closed'
          assigned_to: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          user_id: string
          title: string
          content: string
          category?: 'family' | 'faith' | 'relationship' | 'career' | 'health' | 'general'
          is_anonymous?: boolean
          status?: 'open' | 'in_progress' | 'closed'
          assigned_to?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['counsel_posts']['Insert']>
        Relationships: []
      }
      counsel_bookings: {
        Row: {
          id: number
          user_id: string
          counselor_id: string
          scheduled_at: string
          duration_min: number
          method: 'metaverse' | 'phone' | 'in_person'
          note: string | null
          status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          user_id: string
          counselor_id: string
          scheduled_at: string
          duration_min?: number
          method?: 'metaverse' | 'phone' | 'in_person'
          note?: string | null
          status?: 'pending' | 'confirmed' | 'cancelled' | 'completed'
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['counsel_bookings']['Insert']>
        Relationships: []
      }
      counsel_messages: {
        Row: {
          id: number
          booking_id: number
          sender_id: string
          content: string
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: number
          booking_id: number
          sender_id: string
          content: string
          is_read?: boolean
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['counsel_messages']['Insert']>
        Relationships: []
      }

      // ── 008_realtime ──────────────────────────────────────────
      spaces: {
        Row: {
          id: number
          slug: string
          name: string
          type: 'sanctuary' | 'plaza' | 'cell' | 'prayer' | 'library' | 'scholarship'
          capacity: number
          cell_id: number | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: number
          slug: string
          name: string
          type: 'sanctuary' | 'plaza' | 'cell' | 'prayer' | 'library' | 'scholarship'
          capacity?: number
          cell_id?: number | null
          is_active?: boolean
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['spaces']['Insert']>
        Relationships: []
      }
      chat_messages: {
        Row: {
          id: number
          user_id: string
          space_id: number
          content: string
          type: 'text' | 'emoji' | 'system'
          created_at: string
        }
        Insert: {
          id?: number
          user_id: string
          space_id: number
          content: string
          type?: 'text' | 'emoji' | 'system'
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['chat_messages']['Insert']>
        Relationships: []
      }
      presence_log: {
        Row: {
          id: number
          user_id: string
          space_id: number
          pos_x: number
          pos_z: number
          entered_at: string
        }
        Insert: {
          id?: number
          user_id: string
          space_id: number
          pos_x?: number
          pos_z?: number
          entered_at?: string
        }
        Update: Partial<Database['public']['Tables']['presence_log']['Insert']>
        Relationships: []
      }

      // ── 009_devotion_amens ────────────────────────────────────
      devotion_amens: {
        Row: {
          devotion_id: number
          user_id: string
          created_at: string
        }
        Insert: {
          devotion_id: number
          user_id: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['devotion_amens']['Insert']>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      user_role: UserRole
      challenge_type: ChallengeType
      badge_rarity: BadgeRarity
    }
  }
}

// 편의 타입 alias
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Avatar = Database['public']['Tables']['avatars']['Row']
export type Mission = Database['public']['Tables']['missions']['Row']
export type Cell = Database['public']['Tables']['cells']['Row']
export type BadgeDefinition = Database['public']['Tables']['badge_definitions']['Row']
export type UserBadge = Database['public']['Tables']['user_badges']['Row']
export type Challenge = Database['public']['Tables']['challenges']['Row']
export type ChallengeLog = Database['public']['Tables']['challenge_logs']['Row']
export type Streak = Database['public']['Tables']['streaks']['Row']
export type DevotionLog = Database['public']['Tables']['devotion_logs']['Row']
export type DevotionAmen = Database['public']['Tables']['devotion_amens']['Row']
export type Sermon = Database['public']['Tables']['sermons']['Row']
export type PrayerNote = Database['public']['Tables']['prayer_notes']['Row']
export type PrayerAmen = Database['public']['Tables']['prayer_amens']['Row']
export type CounselPost = Database['public']['Tables']['counsel_posts']['Row']
export type CounselBooking = Database['public']['Tables']['counsel_bookings']['Row']
export type CounselMessage = Database['public']['Tables']['counsel_messages']['Row']
export type Space = Database['public']['Tables']['spaces']['Row']
export type ChatMessage = Database['public']['Tables']['chat_messages']['Row']
export type PresenceLog = Database['public']['Tables']['presence_log']['Row']
