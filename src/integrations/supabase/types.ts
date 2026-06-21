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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      promotions: {
        Row: {
          created_at: string
          end_date: string
          id: string
          payment_status: Database["public"]["Enums"]["payment_status"]
          position: number
          server_id: string
          start_date: string
          type: Database["public"]["Enums"]["promotion_type"]
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          payment_status?: Database["public"]["Enums"]["payment_status"]
          position?: number
          server_id: string
          start_date?: string
          type: Database["public"]["Enums"]["promotion_type"]
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          payment_status?: Database["public"]["Enums"]["payment_status"]
          position?: number
          server_id?: string
          start_date?: string
          type?: Database["public"]["Enums"]["promotion_type"]
        }
        Relationships: [
          {
            foreignKeyName: "promotions_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "servers"
            referencedColumns: ["id"]
          },
        ]
      }
      server_domain_history: {
        Row: {
          changed_at: string
          id: string
          new_domain: string
          old_domain: string
          server_id: string
        }
        Insert: {
          changed_at?: string
          id?: string
          new_domain: string
          old_domain: string
          server_id: string
        }
        Update: {
          changed_at?: string
          id?: string
          new_domain?: string
          old_domain?: string
          server_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "server_domain_history_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "servers"
            referencedColumns: ["id"]
          },
        ]
      }
      server_name_history: {
        Row: {
          changed_at: string
          id: string
          is_paid: boolean
          new_name: string
          old_name: string
          server_id: string
        }
        Insert: {
          changed_at?: string
          id?: string
          is_paid?: boolean
          new_name: string
          old_name: string
          server_id: string
        }
        Update: {
          changed_at?: string
          id?: string
          is_paid?: boolean
          new_name?: string
          old_name?: string
          server_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "server_name_history_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "servers"
            referencedColumns: ["id"]
          },
        ]
      }
      server_stats: {
        Row: {
          date: string
          id: string
          rank: number | null
          server_id: string
          votes: number
        }
        Insert: {
          date?: string
          id?: string
          rank?: number | null
          server_id: string
          votes?: number
        }
        Update: {
          date?: string
          id?: string
          rank?: number | null
          server_id?: string
          votes?: number
        }
        Relationships: [
          {
            foreignKeyName: "server_stats_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "servers"
            referencedColumns: ["id"]
          },
        ]
      }
      servers: {
        Row: {
          banner_url: string | null
          chronicle: string
          country: string | null
          created_at: string
          current_name: string
          description: string
          discord_url: string | null
          domain: string
          first_seen_at: string
          id: string
          logo_url: string | null
          owner_id: string | null
          rates: string
          status: Database["public"]["Enums"]["server_status"]
          updated_at: string
          website_url: string
        }
        Insert: {
          banner_url?: string | null
          chronicle: string
          country?: string | null
          created_at?: string
          current_name: string
          description: string
          discord_url?: string | null
          domain: string
          first_seen_at?: string
          id?: string
          logo_url?: string | null
          owner_id?: string | null
          rates: string
          status?: Database["public"]["Enums"]["server_status"]
          updated_at?: string
          website_url: string
        }
        Update: {
          banner_url?: string | null
          chronicle?: string
          country?: string | null
          created_at?: string
          current_name?: string
          description?: string
          discord_url?: string | null
          domain?: string
          first_seen_at?: string
          id?: string
          logo_url?: string | null
          owner_id?: string | null
          rates?: string
          status?: Database["public"]["Enums"]["server_status"]
          updated_at?: string
          website_url?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      votes: {
        Row: {
          created_at: string
          device_fingerprint: string | null
          id: string
          ip_address: string
          server_id: string
          vote_year: number
        }
        Insert: {
          created_at?: string
          device_fingerprint?: string | null
          id?: string
          ip_address: string
          server_id: string
          vote_year?: number
        }
        Update: {
          created_at?: string
          device_fingerprint?: string | null
          id?: string
          ip_address?: string
          server_id?: string
          vote_year?: number
        }
        Relationships: [
          {
            foreignKeyName: "votes_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "servers"
            referencedColumns: ["id"]
          },
        ]
      }
      yearly_rankings: {
        Row: {
          id: string
          rank: number
          server_id: string
          total_votes: number
          year: number
        }
        Insert: {
          id?: string
          rank: number
          server_id: string
          total_votes?: number
          year: number
        }
        Update: {
          id?: string
          rank?: number
          server_id?: string
          total_votes?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "yearly_rankings_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "servers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_identifier_taken: {
        Args: { _exclude_server: string; _identifier: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      payment_status: "pending" | "paid" | "cancelled"
      promotion_type: "banner" | "sponsored_new" | "spotlight"
      server_status: "pending" | "approved" | "rejected" | "suspended"
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
  public: {
    Enums: {
      app_role: ["admin", "user"],
      payment_status: ["pending", "paid", "cancelled"],
      promotion_type: ["banner", "sponsored_new", "spotlight"],
      server_status: ["pending", "approved", "rejected", "suspended"],
    },
  },
} as const
