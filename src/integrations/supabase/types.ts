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
      ownership_claims: {
        Row: {
          admin_note: string | null
          created_at: string
          decided_at: string | null
          id: string
          message: string | null
          server_id: string
          status: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          created_at?: string
          decided_at?: string | null
          id?: string
          message?: string | null
          server_id: string
          status?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          created_at?: string
          decided_at?: string | null
          id?: string
          message?: string | null
          server_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ownership_claims_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "servers"
            referencedColumns: ["id"]
          },
        ]
      }
      promotion_pricing: {
        Row: {
          cost_per_day: number
          description: string
          exclusive: boolean
          name: string
          type: Database["public"]["Enums"]["promotion_type"]
          updated_at: string
        }
        Insert: {
          cost_per_day: number
          description?: string
          exclusive?: boolean
          name: string
          type: Database["public"]["Enums"]["promotion_type"]
          updated_at?: string
        }
        Update: {
          cost_per_day?: number
          description?: string
          exclusive?: boolean
          name?: string
          type?: Database["public"]["Enums"]["promotion_type"]
          updated_at?: string
        }
        Relationships: []
      }
      promotions: {
        Row: {
          created_at: string
          end_date: string
          id: string
          owner_id: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          position: number
          server_id: string
          spotlight_position: number | null
          start_date: string
          token_cost: number
          type: Database["public"]["Enums"]["promotion_type"]
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          owner_id?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          position?: number
          server_id: string
          spotlight_position?: number | null
          start_date?: string
          token_cost?: number
          type: Database["public"]["Enums"]["promotion_type"]
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          owner_id?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          position?: number
          server_id?: string
          spotlight_position?: number | null
          start_date?: string
          token_cost?: number
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
          admin_notes: string | null
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
          launch_date: string | null
          logo_url: string | null
          moderator_note: string | null
          owner_id: string | null
          rates: string
          reject_reason: string | null
          serial_id: number
          server_type: string | null
          status: Database["public"]["Enums"]["server_status"]
          updated_at: string
          website_url: string
        }
        Insert: {
          admin_notes?: string | null
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
          launch_date?: string | null
          logo_url?: string | null
          moderator_note?: string | null
          owner_id?: string | null
          rates: string
          reject_reason?: string | null
          serial_id?: number
          server_type?: string | null
          status?: Database["public"]["Enums"]["server_status"]
          updated_at?: string
          website_url: string
        }
        Update: {
          admin_notes?: string | null
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
          launch_date?: string | null
          logo_url?: string | null
          moderator_note?: string | null
          owner_id?: string | null
          rates?: string
          reject_reason?: string | null
          serial_id?: number
          server_type?: string | null
          status?: Database["public"]["Enums"]["server_status"]
          updated_at?: string
          website_url?: string
        }
        Relationships: []
      }
      spotlight_pricing: {
        Row: {
          cost_per_day: number
          position: number
          tier: string
          updated_at: string
        }
        Insert: {
          cost_per_day: number
          position: number
          tier: string
          updated_at?: string
        }
        Update: {
          cost_per_day?: number
          position?: number
          tier?: string
          updated_at?: string
        }
        Relationships: []
      }
      token_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          promotion_id: string | null
          type: Database["public"]["Enums"]["token_txn_type"]
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          promotion_id?: string | null
          type: Database["public"]["Enums"]["token_txn_type"]
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          promotion_id?: string | null
          type?: Database["public"]["Enums"]["token_txn_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "token_transactions_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
        ]
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
      user_tokens: {
        Row: {
          balance: number
          created_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          updated_at?: string
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
      create_spotlight_promotion: {
        Args: { _days: number; _position: number; _server_id: string }
        Returns: string
      }
      create_token_promotion: {
        Args: {
          _cost: number
          _days: number
          _server_id: string
          _type: Database["public"]["Enums"]["promotion_type"]
        }
        Returns: string
      }
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
      promotion_type:
        | "banner"
        | "sponsored_new"
        | "spotlight"
        | "banner_left"
        | "banner_right"
        | "sponsored"
      server_status:
        | "pending"
        | "approved"
        | "rejected"
        | "suspended"
        | "changes_requested"
      token_txn_type: "purchase" | "spend" | "refund" | "bonus" | "adjustment"
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
      promotion_type: [
        "banner",
        "sponsored_new",
        "spotlight",
        "banner_left",
        "banner_right",
        "sponsored",
      ],
      server_status: [
        "pending",
        "approved",
        "rejected",
        "suspended",
        "changes_requested",
      ],
      token_txn_type: ["purchase", "spend", "refund", "bonus", "adjustment"],
    },
  },
} as const
