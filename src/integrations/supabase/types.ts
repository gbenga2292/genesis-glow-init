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
      assets: {
        Row: {
          category: string
          condition: string
          created_at: string
          damaged: number
          description: string | null
          id: string
          location: string
          missing: number
          name: string
          quantity: number
          reserved: number
          updated_at: string
        }
        Insert: {
          category: string
          condition?: string
          created_at?: string
          damaged?: number
          description?: string | null
          id?: string
          location?: string
          missing?: number
          name: string
          quantity?: number
          reserved?: number
          updated_at?: string
        }
        Update: {
          category?: string
          condition?: string
          created_at?: string
          damaged?: number
          description?: string | null
          id?: string
          location?: string
          missing?: number
          name?: string
          quantity?: number
          reserved?: number
          updated_at?: string
        }
        Relationships: []
      }
      checkouts: {
        Row: {
          asset_id: string
          checkout_number: string
          condition_on_return: string | null
          created_at: string
          employee_id: string
          expected_return: string | null
          id: string
          quantity: number
          returned_at: string | null
          status: string
        }
        Insert: {
          asset_id: string
          checkout_number: string
          condition_on_return?: string | null
          created_at?: string
          employee_id: string
          expected_return?: string | null
          id?: string
          quantity: number
          returned_at?: string | null
          status?: string
        }
        Update: {
          asset_id?: string
          checkout_number?: string
          condition_on_return?: string | null
          created_at?: string
          employee_id?: string
          expected_return?: string | null
          id?: string
          quantity?: number
          returned_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "checkouts_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkouts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          contact: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          role: string
          status: string
        }
        Insert: {
          contact?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          role: string
          status?: string
        }
        Update: {
          contact?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          role?: string
          status?: string
        }
        Relationships: []
      }
      return_items: {
        Row: {
          asset_id: string
          created_at: string
          id: string
          quantity_damaged: number
          quantity_expected: number
          quantity_good: number
          quantity_missing: number
          return_id: string
        }
        Insert: {
          asset_id: string
          created_at?: string
          id?: string
          quantity_damaged?: number
          quantity_expected: number
          quantity_good?: number
          quantity_missing?: number
          return_id: string
        }
        Update: {
          asset_id?: string
          created_at?: string
          id?: string
          quantity_damaged?: number
          quantity_expected?: number
          quantity_good?: number
          quantity_missing?: number
          return_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "return_items_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_items_return_id_fkey"
            columns: ["return_id"]
            isOneToOne: false
            referencedRelation: "returns"
            referencedColumns: ["id"]
          },
        ]
      }
      returns: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          processed_at: string | null
          return_number: string
          returned_by: string | null
          site_id: string
          status: string
          waybill_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          processed_at?: string | null
          return_number: string
          returned_by?: string | null
          site_id: string
          status?: string
          waybill_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          processed_at?: string | null
          return_number?: string
          returned_by?: string | null
          site_id?: string
          status?: string
          waybill_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "returns_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "returns_waybill_id_fkey"
            columns: ["waybill_id"]
            isOneToOne: false
            referencedRelation: "waybills"
            referencedColumns: ["id"]
          },
        ]
      }
      site_inventory: {
        Row: {
          asset_id: string
          created_at: string
          id: string
          quantity: number
          site_id: string
          updated_at: string
        }
        Insert: {
          asset_id: string
          created_at?: string
          id?: string
          quantity?: number
          site_id: string
          updated_at?: string
        }
        Update: {
          asset_id?: string
          created_at?: string
          id?: string
          quantity?: number
          site_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_inventory_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_inventory_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      sites: {
        Row: {
          contact: string | null
          created_at: string
          id: string
          manager: string | null
          name: string
          project_name: string | null
          status: string
          updated_at: string
        }
        Insert: {
          contact?: string | null
          created_at?: string
          id?: string
          manager?: string | null
          name: string
          project_name?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          contact?: string | null
          created_at?: string
          id?: string
          manager?: string | null
          name?: string
          project_name?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      transaction_log: {
        Row: {
          asset_id: string
          created_at: string
          from_location: string | null
          id: string
          notes: string | null
          quantity: number
          reference_id: string | null
          reference_type: string | null
          to_location: string | null
          transaction_type: string
        }
        Insert: {
          asset_id: string
          created_at?: string
          from_location?: string | null
          id?: string
          notes?: string | null
          quantity: number
          reference_id?: string | null
          reference_type?: string | null
          to_location?: string | null
          transaction_type: string
        }
        Update: {
          asset_id?: string
          created_at?: string
          from_location?: string | null
          id?: string
          notes?: string | null
          quantity?: number
          reference_id?: string | null
          reference_type?: string | null
          to_location?: string | null
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_log_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      waybill_items: {
        Row: {
          asset_id: string
          created_at: string
          id: string
          quantity: number
          waybill_id: string
        }
        Insert: {
          asset_id: string
          created_at?: string
          id?: string
          quantity: number
          waybill_id: string
        }
        Update: {
          asset_id?: string
          created_at?: string
          id?: string
          quantity?: number
          waybill_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "waybill_items_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waybill_items_waybill_id_fkey"
            columns: ["waybill_id"]
            isOneToOne: false
            referencedRelation: "waybills"
            referencedColumns: ["id"]
          },
        ]
      }
      waybills: {
        Row: {
          created_at: string
          driver: string | null
          expected_return: string | null
          id: string
          site_id: string
          status: string
          updated_at: string
          vehicle: string | null
          waybill_number: string
        }
        Insert: {
          created_at?: string
          driver?: string | null
          expected_return?: string | null
          id?: string
          site_id: string
          status?: string
          updated_at?: string
          vehicle?: string | null
          waybill_number: string
        }
        Update: {
          created_at?: string
          driver?: string | null
          expected_return?: string | null
          id?: string
          site_id?: string
          status?: string
          updated_at?: string
          vehicle?: string | null
          waybill_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "waybills_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
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
