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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          action: string
          created_at: string | null
          details: string | null
          entity: string
          entity_id: string | null
          id: string
          timestamp: string
          updated_at: string | null
          user_id: string | null
          user_name: string
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: string | null
          entity: string
          entity_id?: string | null
          id: string
          timestamp: string
          updated_at?: string | null
          user_id?: string | null
          user_name: string
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: string | null
          entity?: string
          entity_id?: string | null
          id?: string
          timestamp?: string
          updated_at?: string | null
          user_id?: string | null
          user_name?: string
        }
        Relationships: []
      }
      assets: {
        Row: {
          available_quantity: number | null
          category: string | null
          condition: string | null
          cost: number | null
          created_at: string | null
          critical_stock_level: number | null
          damaged_count: number | null
          description: string | null
          electricity_consumption: number | null
          fuel_capacity: number | null
          fuel_consumption_rate: number | null
          id: number
          location: string | null
          low_stock_level: number | null
          missing_count: number | null
          name: string
          power_source: string | null
          purchase_date: string | null
          quantity: number
          requires_logging: boolean | null
          reserved_quantity: number | null
          service: string | null
          site_id: number | null
          site_quantities: string | null
          status: string | null
          type: string | null
          unit_of_measurement: string
          updated_at: string | null
          used_count: number | null
        }
        Insert: {
          available_quantity?: number | null
          category?: string | null
          condition?: string | null
          cost?: number | null
          created_at?: string | null
          critical_stock_level?: number | null
          damaged_count?: number | null
          description?: string | null
          electricity_consumption?: number | null
          fuel_capacity?: number | null
          fuel_consumption_rate?: number | null
          id?: number
          location?: string | null
          low_stock_level?: number | null
          missing_count?: number | null
          name: string
          power_source?: string | null
          purchase_date?: string | null
          quantity?: number
          requires_logging?: boolean | null
          reserved_quantity?: number | null
          service?: string | null
          site_id?: number | null
          site_quantities?: string | null
          status?: string | null
          type?: string | null
          unit_of_measurement: string
          updated_at?: string | null
          used_count?: number | null
        }
        Update: {
          available_quantity?: number | null
          category?: string | null
          condition?: string | null
          cost?: number | null
          created_at?: string | null
          critical_stock_level?: number | null
          damaged_count?: number | null
          description?: string | null
          electricity_consumption?: number | null
          fuel_capacity?: number | null
          fuel_consumption_rate?: number | null
          id?: number
          location?: string | null
          low_stock_level?: number | null
          missing_count?: number | null
          name?: string
          power_source?: string | null
          purchase_date?: string | null
          quantity?: number
          requires_logging?: boolean | null
          reserved_quantity?: number | null
          service?: string | null
          site_id?: number | null
          site_quantities?: string | null
          status?: string | null
          type?: string | null
          unit_of_measurement?: string
          updated_at?: string | null
          used_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "assets_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      company_settings: {
        Row: {
          address: string
          ai_config: string | null
          company_name: string
          created_at: string | null
          currency: string | null
          date_format: string | null
          email: string
          id: number
          logo: string | null
          notifications_email: boolean | null
          notifications_push: boolean | null
          phone: string
          theme: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          address: string
          ai_config?: string | null
          company_name: string
          created_at?: string | null
          currency?: string | null
          date_format?: string | null
          email: string
          id?: number
          logo?: string | null
          notifications_email?: boolean | null
          notifications_push?: boolean | null
          phone: string
          theme?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          address?: string
          ai_config?: string | null
          company_name?: string
          created_at?: string | null
          currency?: string | null
          date_format?: string | null
          email?: string
          id?: number
          logo?: string | null
          notifications_email?: boolean | null
          notifications_push?: boolean | null
          phone?: string
          theme?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      consumable_logs: {
        Row: {
          consumable_id: string
          consumable_name: string
          created_at: string | null
          date: string
          id: string
          notes: string | null
          quantity_remaining: number
          quantity_used: number
          site_id: number
          unit: string
          updated_at: string | null
          used_by: string
          used_for: string
        }
        Insert: {
          consumable_id: string
          consumable_name: string
          created_at?: string | null
          date: string
          id: string
          notes?: string | null
          quantity_remaining: number
          quantity_used: number
          site_id: number
          unit: string
          updated_at?: string | null
          used_by: string
          used_for: string
        }
        Update: {
          consumable_id?: string
          consumable_name?: string
          created_at?: string | null
          date?: string
          id?: string
          notes?: string | null
          quantity_remaining?: number
          quantity_used?: number
          site_id?: number
          unit?: string
          updated_at?: string | null
          used_by?: string
          used_for?: string
        }
        Relationships: [
          {
            foreignKeyName: "consumable_logs_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          created_at: string | null
          delisted_date: string | null
          email: string | null
          id: number
          name: string
          phone: string | null
          role: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          delisted_date?: string | null
          email?: string | null
          id?: number
          name: string
          phone?: string | null
          role: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          delisted_date?: string | null
          email?: string | null
          id?: number
          name?: string
          phone?: string | null
          role?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      equipment_logs: {
        Row: {
          active: boolean | null
          client_feedback: string | null
          created_at: string | null
          date: string
          diesel_entered: number | null
          downtime_entries: Json | null
          equipment_id: number
          equipment_name: string
          id: number
          issues_on_site: string | null
          maintenance_details: string | null
          site_id: number
          supervisor_on_site: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          client_feedback?: string | null
          created_at?: string | null
          date: string
          diesel_entered?: number | null
          downtime_entries?: Json | null
          equipment_id: number
          equipment_name: string
          id?: number
          issues_on_site?: string | null
          maintenance_details?: string | null
          site_id: number
          supervisor_on_site?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          client_feedback?: string | null
          created_at?: string | null
          date?: string
          diesel_entered?: number | null
          downtime_entries?: Json | null
          equipment_id?: number
          equipment_name?: string
          id?: number
          issues_on_site?: string | null
          maintenance_details?: string | null
          site_id?: number
          supervisor_on_site?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_logs_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_logs_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_logs: {
        Row: {
          cost: number | null
          created_at: string | null
          date_completed: string | null
          date_started: string
          downtime: number | null
          id: number
          location: string | null
          machine_active_at_time: boolean | null
          machine_id: number
          maintenance_type: string
          next_service_due: string | null
          parts_replaced: string | null
          reason: string
          remarks: string | null
          service_reset: boolean | null
          technician: string
          updated_at: string | null
          work_done: string
        }
        Insert: {
          cost?: number | null
          created_at?: string | null
          date_completed?: string | null
          date_started: string
          downtime?: number | null
          id?: number
          location?: string | null
          machine_active_at_time?: boolean | null
          machine_id: number
          maintenance_type: string
          next_service_due?: string | null
          parts_replaced?: string | null
          reason: string
          remarks?: string | null
          service_reset?: boolean | null
          technician: string
          updated_at?: string | null
          work_done: string
        }
        Update: {
          cost?: number | null
          created_at?: string | null
          date_completed?: string | null
          date_started?: string
          downtime?: number | null
          id?: number
          location?: string | null
          machine_active_at_time?: boolean | null
          machine_id?: number
          maintenance_type?: string
          next_service_due?: string | null
          parts_replaced?: string | null
          reason?: string
          remarks?: string | null
          service_reset?: boolean | null
          technician?: string
          updated_at?: string | null
          work_done?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_logs_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      metrics_snapshots: {
        Row: {
          created_at: string | null
          id: number
          low_stock: number | null
          out_of_stock: number | null
          outstanding_checkouts: number | null
          outstanding_waybills: number | null
          snapshot_date: string
          total_assets: number | null
          total_quantity: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          low_stock?: number | null
          out_of_stock?: number | null
          outstanding_checkouts?: number | null
          outstanding_waybills?: number | null
          snapshot_date: string
          total_assets?: number | null
          total_quantity?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          low_stock?: number | null
          out_of_stock?: number | null
          outstanding_checkouts?: number | null
          outstanding_waybills?: number | null
          snapshot_date?: string
          total_assets?: number | null
          total_quantity?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      quick_checkouts: {
        Row: {
          asset_id: number
          checkout_date: string
          created_at: string | null
          employee_id: number | null
          expected_return_days: number
          id: number
          quantity: number
          returned_quantity: number | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          asset_id: number
          checkout_date: string
          created_at?: string | null
          employee_id?: number | null
          expected_return_days: number
          id?: number
          quantity: number
          returned_quantity?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          asset_id?: number
          checkout_date?: string
          created_at?: string | null
          employee_id?: number | null
          expected_return_days?: number
          id?: number
          quantity?: number
          returned_quantity?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quick_checkouts_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quick_checkouts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      return_bills: {
        Row: {
          condition: string | null
          created_at: string | null
          id: number
          notes: string | null
          received_by: string
          return_date: string
          status: string | null
          updated_at: string | null
          waybill_id: string
        }
        Insert: {
          condition?: string | null
          created_at?: string | null
          id?: number
          notes?: string | null
          received_by: string
          return_date: string
          status?: string | null
          updated_at?: string | null
          waybill_id: string
        }
        Update: {
          condition?: string | null
          created_at?: string | null
          id?: number
          notes?: string | null
          received_by?: string
          return_date?: string
          status?: string | null
          updated_at?: string | null
          waybill_id?: string
        }
        Relationships: []
      }
      return_items: {
        Row: {
          asset_id: number
          condition: string | null
          created_at: string | null
          id: number
          quantity: number
          return_bill_id: number
          updated_at: string | null
        }
        Insert: {
          asset_id: number
          condition?: string | null
          created_at?: string | null
          id?: number
          quantity: number
          return_bill_id: number
          updated_at?: string | null
        }
        Update: {
          asset_id?: number
          condition?: string | null
          created_at?: string | null
          id?: number
          quantity?: number
          return_bill_id?: number
          updated_at?: string | null
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
            foreignKeyName: "return_items_return_bill_id_fkey"
            columns: ["return_bill_id"]
            isOneToOne: false
            referencedRelation: "return_bills"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_api_keys: {
        Row: {
          api_key: string
          created_at: string | null
          endpoint: string | null
          id: number
          is_active: boolean | null
          key_name: string
          model: string | null
          provider: string
          updated_at: string | null
        }
        Insert: {
          api_key: string
          created_at?: string | null
          endpoint?: string | null
          id?: number
          is_active?: boolean | null
          key_name: string
          model?: string | null
          provider: string
          updated_at?: string | null
        }
        Update: {
          api_key?: string
          created_at?: string | null
          endpoint?: string | null
          id?: number
          is_active?: boolean | null
          key_name?: string
          model?: string | null
          provider?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      site_transactions: {
        Row: {
          asset_id: number
          asset_name: string
          condition: string | null
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          quantity: number
          reference_id: string
          reference_type: string
          site_id: number
          transaction_type: string
          type: string
        }
        Insert: {
          asset_id: number
          asset_name: string
          condition?: string | null
          created_at: string
          created_by?: string | null
          id: string
          notes?: string | null
          quantity: number
          reference_id: string
          reference_type: string
          site_id: number
          transaction_type: string
          type: string
        }
        Update: {
          asset_id?: number
          asset_name?: string
          condition?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          quantity?: number
          reference_id?: string
          reference_type?: string
          site_id?: number
          transaction_type?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_transactions_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_transactions_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      sites: {
        Row: {
          client_name: string | null
          contact_person: string | null
          created_at: string | null
          description: string | null
          id: number
          location: string
          name: string
          phone: string | null
          service: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          client_name?: string | null
          contact_person?: string | null
          created_at?: string | null
          description?: string | null
          id?: number
          location: string
          name: string
          phone?: string | null
          service?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          client_name?: string | null
          contact_person?: string | null
          created_at?: string | null
          description?: string | null
          id?: number
          location?: string
          name?: string
          phone?: string | null
          service?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: number
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_public"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          email: string | null
          id: number
          name: string
          password_hash: string
          role: string
          updated_at: string | null
          username: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: number
          name: string
          password_hash: string
          role: string
          updated_at?: string | null
          username: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: number
          name?: string
          password_hash?: string
          role?: string
          updated_at?: string | null
          username?: string
        }
        Relationships: []
      }
      vehicles: {
        Row: {
          created_at: string | null
          id: number
          name: string
          registration_number: string | null
          status: string | null
          type: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          name: string
          registration_number?: string | null
          status?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          name?: string
          registration_number?: string | null
          status?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      waybills: {
        Row: {
          created_at: string | null
          created_by: string | null
          driver_name: string | null
          expected_return_date: string | null
          id: string
          issue_date: string
          items: Json | null
          purpose: string
          return_to_site_id: number | null
          sent_to_site_date: string | null
          service: string
          site_id: number | null
          status: string | null
          type: string | null
          updated_at: string | null
          vehicle: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          driver_name?: string | null
          expected_return_date?: string | null
          id: string
          issue_date: string
          items?: Json | null
          purpose: string
          return_to_site_id?: number | null
          sent_to_site_date?: string | null
          service: string
          site_id?: number | null
          status?: string | null
          type?: string | null
          updated_at?: string | null
          vehicle?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          driver_name?: string | null
          expected_return_date?: string | null
          id?: string
          issue_date?: string
          items?: Json | null
          purpose?: string
          return_to_site_id?: number | null
          sent_to_site_date?: string | null
          service?: string
          site_id?: number | null
          status?: string | null
          type?: string | null
          updated_at?: string | null
          vehicle?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "waybills_return_to_site_id_fkey"
            columns: ["return_to_site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
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
      users_public: {
        Row: {
          created_at: string | null
          email: string | null
          id: number | null
          name: string | null
          role: string | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: number | null
          name?: string | null
          role?: string | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: number | null
          name?: string | null
          role?: string | null
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: number
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "data_entry_supervisor"
        | "regulatory"
        | "manager"
        | "staff"
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
      app_role: [
        "admin",
        "data_entry_supervisor",
        "regulatory",
        "manager",
        "staff",
      ],
    },
  },
} as const
