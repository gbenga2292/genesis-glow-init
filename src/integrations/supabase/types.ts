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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          action: string
          details: string | null
          entity: string
          entity_id: string | null
          id: string
          timestamp: string | null
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          action: string
          details?: string | null
          entity: string
          entity_id?: string | null
          id: string
          timestamp?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          action?: string
          details?: string | null
          entity?: string
          entity_id?: string | null
          id?: string
          timestamp?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: []
      }
      backup_settings: {
        Row: {
          auto_backup: boolean | null
          created_at: string | null
          frequency: string | null
          id: number
          last_backup: string | null
          retention_count: number | null
          updated_at: string | null
        }
        Insert: {
          auto_backup?: boolean | null
          created_at?: string | null
          frequency?: string | null
          id?: number
          last_backup?: string | null
          retention_count?: number | null
          updated_at?: string | null
        }
        Update: {
          auto_backup?: boolean | null
          created_at?: string | null
          frequency?: string | null
          id?: number
          last_backup?: string | null
          retention_count?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      company_settings: {
        Row: {
          address: string | null
          company_name: string | null
          created_at: string | null
          currency: string | null
          date_format: string | null
          email: string | null
          id: number
          logo: string | null
          notifications_email: boolean | null
          notifications_push: boolean | null
          phone: string | null
          theme: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          company_name?: string | null
          created_at?: string | null
          currency?: string | null
          date_format?: string | null
          email?: string | null
          id?: number
          logo?: string | null
          notifications_email?: boolean | null
          notifications_push?: boolean | null
          phone?: string | null
          theme?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          company_name?: string | null
          created_at?: string | null
          currency?: string | null
          date_format?: string | null
          email?: string | null
          id?: number
          logo?: string | null
          notifications_email?: boolean | null
          notifications_push?: boolean | null
          phone?: string | null
          theme?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      employees: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          name: string
          phone: string | null
          role: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id: string
          name: string
          phone?: string | null
          role?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          role?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      items: {
        Row: {
          category: string | null
          checkout_type: string | null
          condition: string | null
          created_at: string | null
          critical_stock_level: number | null
          description: string | null
          id: string
          location: string | null
          low_stock_level: number | null
          name: string
          quantity: number | null
          reserved: number | null
          status: string | null
          total_stock: number | null
          type: string | null
          unit: string | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          checkout_type?: string | null
          condition?: string | null
          created_at?: string | null
          critical_stock_level?: number | null
          description?: string | null
          id: string
          location?: string | null
          low_stock_level?: number | null
          name: string
          quantity?: number | null
          reserved?: number | null
          status?: string | null
          total_stock?: number | null
          type?: string | null
          unit?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          checkout_type?: string | null
          condition?: string | null
          created_at?: string | null
          critical_stock_level?: number | null
          description?: string | null
          id?: string
          location?: string | null
          low_stock_level?: number | null
          name?: string
          quantity?: number | null
          reserved?: number | null
          status?: string | null
          total_stock?: number | null
          type?: string | null
          unit?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      metrics_snapshots: {
        Row: {
          created_at: string
          id: string
          low_stock: number
          out_of_stock: number
          outstanding_checkouts: number
          outstanding_waybills: number
          snapshot_date: string
          total_assets: number
          total_quantity: number
        }
        Insert: {
          created_at?: string
          id?: string
          low_stock?: number
          out_of_stock?: number
          outstanding_checkouts?: number
          outstanding_waybills?: number
          snapshot_date: string
          total_assets?: number
          total_quantity?: number
        }
        Update: {
          created_at?: string
          id?: string
          low_stock?: number
          out_of_stock?: number
          outstanding_checkouts?: number
          outstanding_waybills?: number
          snapshot_date?: string
          total_assets?: number
          total_quantity?: number
        }
        Relationships: []
      }
      quick_checkouts: {
        Row: {
          asset_id: string
          asset_name: string
          checkout_date: string | null
          created_at: string | null
          employee: string
          expected_return_days: number | null
          id: string
          quantity: number
          site_id: string | null
          status: string | null
        }
        Insert: {
          asset_id: string
          asset_name: string
          checkout_date?: string | null
          created_at?: string | null
          employee: string
          expected_return_days?: number | null
          id: string
          quantity: number
          site_id?: string | null
          status?: string | null
        }
        Update: {
          asset_id?: string
          asset_name?: string
          checkout_date?: string | null
          created_at?: string | null
          employee?: string
          expected_return_days?: number | null
          id?: string
          quantity?: number
          site_id?: string | null
          status?: string | null
        }
        Relationships: []
      }
      return_bills: {
        Row: {
          condition: string | null
          created_at: string | null
          id: string
          items: Json | null
          notes: string | null
          received_by: string | null
          return_date: string | null
          status: string | null
          waybill_id: string | null
        }
        Insert: {
          condition?: string | null
          created_at?: string | null
          id: string
          items?: Json | null
          notes?: string | null
          received_by?: string | null
          return_date?: string | null
          status?: string | null
          waybill_id?: string | null
        }
        Update: {
          condition?: string | null
          created_at?: string | null
          id?: string
          items?: Json | null
          notes?: string | null
          received_by?: string | null
          return_date?: string | null
          status?: string | null
          waybill_id?: string | null
        }
        Relationships: []
      }
      site_inventory: {
        Row: {
          category: string | null
          created_at: string | null
          id: string
          item_id: string
          item_name: string
          last_updated: string | null
          quantity: number | null
          site_id: string
          unit: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          id: string
          item_id: string
          item_name: string
          last_updated?: string | null
          quantity?: number | null
          site_id: string
          unit?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          id?: string
          item_id?: string
          item_name?: string
          last_updated?: string | null
          quantity?: number | null
          site_id?: string
          unit?: string | null
        }
        Relationships: []
      }
      site_transactions: {
        Row: {
          asset_id: string | null
          asset_name: string | null
          condition: string | null
          created_at: string | null
          created_by: string | null
          id: string
          notes: string | null
          quantity: number | null
          reference_id: string | null
          reference_type: string | null
          site_id: string | null
          transaction_type: string | null
          type: string | null
        }
        Insert: {
          asset_id?: string | null
          asset_name?: string | null
          condition?: string | null
          created_at?: string | null
          created_by?: string | null
          id: string
          notes?: string | null
          quantity?: number | null
          reference_id?: string | null
          reference_type?: string | null
          site_id?: string | null
          transaction_type?: string | null
          type?: string | null
        }
        Update: {
          asset_id?: string | null
          asset_name?: string | null
          condition?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          quantity?: number | null
          reference_id?: string | null
          reference_type?: string | null
          site_id?: string | null
          transaction_type?: string | null
          type?: string | null
        }
        Relationships: []
      }
      sites: {
        Row: {
          client_name: string | null
          contact_person: string | null
          created_at: string | null
          description: string | null
          id: string
          location: string | null
          name: string
          phone: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          client_name?: string | null
          contact_person?: string | null
          created_at?: string | null
          description?: string | null
          id: string
          location?: string | null
          name: string
          phone?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          client_name?: string | null
          contact_person?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          location?: string | null
          name?: string
          phone?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      vehicles: {
        Row: {
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          id: string
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      waybills: {
        Row: {
          created_at: string | null
          driver_name: string | null
          expected_return_date: string | null
          id: string
          issue_date: string | null
          items: Json | null
          purpose: string | null
          return_to_site_id: string | null
          service: string | null
          site_id: string | null
          status: string | null
          type: string | null
          updated_at: string | null
          vehicle: string | null
        }
        Insert: {
          created_at?: string | null
          driver_name?: string | null
          expected_return_date?: string | null
          id: string
          issue_date?: string | null
          items?: Json | null
          purpose?: string | null
          return_to_site_id?: string | null
          service?: string | null
          site_id?: string | null
          status?: string | null
          type?: string | null
          updated_at?: string | null
          vehicle?: string | null
        }
        Update: {
          created_at?: string | null
          driver_name?: string | null
          expected_return_date?: string | null
          id?: string
          issue_date?: string | null
          items?: Json | null
          purpose?: string | null
          return_to_site_id?: string | null
          service?: string | null
          site_id?: string | null
          status?: string | null
          type?: string | null
          updated_at?: string | null
          vehicle?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
