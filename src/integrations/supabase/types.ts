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
      barbershop_clients: {
        Row: {
          barbershop_id: string
          client_id: string
          created_at: string | null
          email: string | null
          first_visit: string | null
          id: string
          is_active: boolean | null
          last_visit: string | null
          notes: string | null
          phone: string | null
          total_visits: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          barbershop_id: string
          client_id: string
          created_at?: string | null
          email?: string | null
          first_visit?: string | null
          id?: string
          is_active?: boolean | null
          last_visit?: string | null
          notes?: string | null
          phone?: string | null
          total_visits?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          barbershop_id?: string
          client_id?: string
          created_at?: string | null
          email?: string | null
          first_visit?: string | null
          id?: string
          is_active?: boolean | null
          last_visit?: string | null
          notes?: string | null
          phone?: string | null
          total_visits?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "barbershop_clients_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "barbershop_clients_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "barbershop_clients_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      barbershop_info: {
        Row: {
          address: string | null
          closing_time: string | null
          created_at: string
          description: string | null
          id: string
          instagram: string | null
          logo_url: string | null
          name: string
          opening_days: string[] | null
          opening_time: string | null
          phone: string | null
          photos: string[] | null
          tiktok: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          closing_time?: string | null
          created_at?: string
          description?: string | null
          id?: string
          instagram?: string | null
          logo_url?: string | null
          name?: string
          opening_days?: string[] | null
          opening_time?: string | null
          phone?: string | null
          photos?: string[] | null
          tiktok?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          closing_time?: string | null
          created_at?: string
          description?: string | null
          id?: string
          instagram?: string | null
          logo_url?: string | null
          name?: string
          opening_days?: string[] | null
          opening_time?: string | null
          phone?: string | null
          photos?: string[] | null
          tiktok?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      barbershop_settings: {
        Row: {
          allow_online_payments: boolean | null
          auto_confirm_bookings: boolean | null
          barbershop_id: string
          booking_advance_days: number | null
          booking_cancellation_hours: number | null
          created_at: string
          deposit_percentage: number | null
          evolution_api_key: string | null
          evolution_api_url: string | null
          evolution_instance_name: string | null
          id: string
          n8n_webhook_url: string | null
          n8n_whatsapp_webhook_url: string | null
          reminder_hours_before: number | null
          require_deposit: boolean | null
          send_booking_confirmation: boolean | null
          send_booking_reminder: boolean | null
          send_booking_reminders: boolean | null
          timezone: string | null
          updated_at: string
          whatsapp_enabled: boolean | null
          whatsapp_send_booking_confirmation: boolean | null
          whatsapp_send_booking_reminder: boolean | null
        }
        Insert: {
          allow_online_payments?: boolean | null
          auto_confirm_bookings?: boolean | null
          barbershop_id: string
          booking_advance_days?: number | null
          booking_cancellation_hours?: number | null
          created_at?: string
          deposit_percentage?: number | null
          evolution_api_key?: string | null
          evolution_api_url?: string | null
          evolution_instance_name?: string | null
          id?: string
          n8n_webhook_url?: string | null
          n8n_whatsapp_webhook_url?: string | null
          reminder_hours_before?: number | null
          require_deposit?: boolean | null
          send_booking_confirmation?: boolean | null
          send_booking_reminder?: boolean | null
          send_booking_reminders?: boolean | null
          timezone?: string | null
          updated_at?: string
          whatsapp_enabled?: boolean | null
          whatsapp_send_booking_confirmation?: boolean | null
          whatsapp_send_booking_reminder?: boolean | null
        }
        Update: {
          allow_online_payments?: boolean | null
          auto_confirm_bookings?: boolean | null
          barbershop_id?: string
          booking_advance_days?: number | null
          booking_cancellation_hours?: number | null
          created_at?: string
          deposit_percentage?: number | null
          evolution_api_key?: string | null
          evolution_api_url?: string | null
          evolution_instance_name?: string | null
          id?: string
          n8n_webhook_url?: string | null
          n8n_whatsapp_webhook_url?: string | null
          reminder_hours_before?: number | null
          require_deposit?: boolean | null
          send_booking_confirmation?: boolean | null
          send_booking_reminder?: boolean | null
          send_booking_reminders?: boolean | null
          timezone?: string | null
          updated_at?: string
          whatsapp_enabled?: boolean | null
          whatsapp_send_booking_confirmation?: boolean | null
          whatsapp_send_booking_reminder?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "barbershop_settings_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: true
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "barbershop_settings_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: true
            referencedRelation: "barbershops_public"
            referencedColumns: ["id"]
          },
        ]
      }
      barbershop_subscriptions: {
        Row: {
          asaas_customer_id: string | null
          asaas_payment_id: string | null
          asaas_payment_link: string | null
          barbershop_id: string
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          paid_at: string | null
          payment_method: string | null
          payment_value: number | null
          plan_type: string
          status: string
          subscription_ends_at: string | null
          subscription_started_at: string | null
          trial_ends_at: string | null
          trial_started_at: string | null
          updated_at: string
        }
        Insert: {
          asaas_customer_id?: string | null
          asaas_payment_id?: string | null
          asaas_payment_link?: string | null
          barbershop_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          payment_value?: number | null
          plan_type?: string
          status?: string
          subscription_ends_at?: string | null
          subscription_started_at?: string | null
          trial_ends_at?: string | null
          trial_started_at?: string | null
          updated_at?: string
        }
        Update: {
          asaas_customer_id?: string | null
          asaas_payment_id?: string | null
          asaas_payment_link?: string | null
          barbershop_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          payment_value?: number | null
          plan_type?: string
          status?: string
          subscription_ends_at?: string | null
          subscription_started_at?: string | null
          trial_ends_at?: string | null
          trial_started_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "barbershop_subscriptions_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "barbershop_subscriptions_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops_public"
            referencedColumns: ["id"]
          },
        ]
      }
      barbershops: {
        Row: {
          address: string | null
          business_hours: Json | null
          closing_time: string | null
          cover_url: string | null
          created_at: string
          description: string | null
          id: string
          instagram: string | null
          is_active: boolean | null
          is_official: boolean | null
          logo_url: string | null
          mensagem_personalizada: string | null
          name: string
          opening_days: string[] | null
          opening_time: string | null
          owner_id: string
          phone: string | null
          primary_color: string
          slug: string
          theme_primary_color: string | null
          theme_secondary_color: string | null
          tiktok: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          business_hours?: Json | null
          closing_time?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          instagram?: string | null
          is_active?: boolean | null
          is_official?: boolean | null
          logo_url?: string | null
          mensagem_personalizada?: string | null
          name: string
          opening_days?: string[] | null
          opening_time?: string | null
          owner_id: string
          phone?: string | null
          primary_color?: string
          slug: string
          theme_primary_color?: string | null
          theme_secondary_color?: string | null
          tiktok?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          business_hours?: Json | null
          closing_time?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          instagram?: string | null
          is_active?: boolean | null
          is_official?: boolean | null
          logo_url?: string | null
          mensagem_personalizada?: string | null
          name?: string
          opening_days?: string[] | null
          opening_time?: string | null
          owner_id?: string
          phone?: string | null
          primary_color?: string
          slug?: string
          theme_primary_color?: string | null
          theme_secondary_color?: string | null
          tiktok?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      booking_reminders_sent: {
        Row: {
          booking_id: string
          id: string
          sent_at: string | null
        }
        Insert: {
          booking_id: string
          id?: string
          sent_at?: string | null
        }
        Update: {
          booking_id?: string
          id?: string
          sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_reminders_sent_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          barbershop_id: string
          booking_date: string
          booking_time: string
          client_id: string
          created_at: string
          id: string
          notes: string | null
          price: number | null
          professional_id: string
          service_id: string
          status: string
          total_price: number
          updated_at: string
        }
        Insert: {
          barbershop_id: string
          booking_date: string
          booking_time: string
          client_id: string
          created_at?: string
          id?: string
          notes?: string | null
          price?: number | null
          professional_id: string
          service_id: string
          status?: string
          total_price: number
          updated_at?: string
        }
        Update: {
          barbershop_id?: string
          booking_date?: string
          booking_time?: string
          client_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          price?: number | null
          professional_id?: string
          service_id?: string
          status?: string
          total_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      client_segment_assignments: {
        Row: {
          client_id: string
          created_at: string
          id: string
          segment_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          segment_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          segment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_segment_assignments_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "client_segments"
            referencedColumns: ["id"]
          },
        ]
      }
      client_segments: {
        Row: {
          barbershop_id: string
          color: string | null
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          barbershop_id: string
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          barbershop_id?: string
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_segments_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_segments_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops_public"
            referencedColumns: ["id"]
          },
        ]
      }
      client_subscriptions: {
        Row: {
          barbershop_id: string
          client_id: string
          created_at: string | null
          end_date: string
          expires_at: string | null
          id: string
          mercadopago_preference_id: string | null
          payment_method: string | null
          payment_status: string | null
          plan_id: string
          services_used_this_month: number | null
          start_date: string
          started_at: string | null
          status: string
          transaction_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          barbershop_id: string
          client_id: string
          created_at?: string | null
          end_date: string
          expires_at?: string | null
          id?: string
          mercadopago_preference_id?: string | null
          payment_method?: string | null
          payment_status?: string | null
          plan_id: string
          services_used_this_month?: number | null
          start_date?: string
          started_at?: string | null
          status?: string
          transaction_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          barbershop_id?: string
          client_id?: string
          created_at?: string | null
          end_date?: string
          expires_at?: string | null
          id?: string
          mercadopago_preference_id?: string | null
          payment_method?: string | null
          payment_status?: string | null
          plan_id?: string
          services_used_this_month?: number | null
          start_date?: string
          started_at?: string | null
          status?: string
          transaction_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_subscriptions_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_subscriptions_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_subscriptions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_items: {
        Row: {
          applied_commission_rate: number
          barbershop_id: string
          booking_id: string | null
          commission_amount: number
          created_at: string
          gross_amount: number
          id: string
          occurred_at: string
          paid_at: string | null
          payment_status: Database["public"]["Enums"]["commission_payment_status"]
          professional_id: string
          source_type: Database["public"]["Enums"]["commission_source_type"]
          updated_at: string
        }
        Insert: {
          applied_commission_rate: number
          barbershop_id: string
          booking_id?: string | null
          commission_amount?: number
          created_at?: string
          gross_amount?: number
          id?: string
          occurred_at: string
          paid_at?: string | null
          payment_status?: Database["public"]["Enums"]["commission_payment_status"]
          professional_id: string
          source_type?: Database["public"]["Enums"]["commission_source_type"]
          updated_at?: string
        }
        Update: {
          applied_commission_rate?: number
          barbershop_id?: string
          booking_id?: string | null
          commission_amount?: number
          created_at?: string
          gross_amount?: number
          id?: string
          occurred_at?: string
          paid_at?: string | null
          payment_status?: Database["public"]["Enums"]["commission_payment_status"]
          professional_id?: string
          source_type?: Database["public"]["Enums"]["commission_source_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commission_items_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_items_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_items_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_items_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_payment_logs: {
        Row: {
          barbershop_id: string
          commission_item_ids: string[]
          created_at: string
          id: string
          note: string | null
          paid_at: string
          paid_by_user_id: string
          professional_id: string | null
        }
        Insert: {
          barbershop_id: string
          commission_item_ids: string[]
          created_at?: string
          id?: string
          note?: string | null
          paid_at?: string
          paid_by_user_id: string
          professional_id?: string | null
        }
        Update: {
          barbershop_id?: string
          commission_item_ids?: string[]
          created_at?: string
          id?: string
          note?: string | null
          paid_at?: string
          paid_by_user_id?: string
          professional_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commission_payment_logs_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_payment_logs_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_payment_logs_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_payments: {
        Row: {
          barbershop_id: string
          commission_amount: number
          commission_rate: number
          created_at: string
          gross_amount: number
          id: string
          notes: string | null
          paid_at: string | null
          period_end: string
          period_start: string
          professional_id: string
          status: string
          updated_at: string
        }
        Insert: {
          barbershop_id: string
          commission_amount?: number
          commission_rate: number
          created_at?: string
          gross_amount?: number
          id?: string
          notes?: string | null
          paid_at?: string | null
          period_end: string
          period_start: string
          professional_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          barbershop_id?: string
          commission_amount?: number
          commission_rate?: number
          created_at?: string
          gross_amount?: number
          id?: string
          notes?: string | null
          paid_at?: string | null
          period_end?: string
          period_start?: string
          professional_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commission_payments_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_payments_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_payments_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_rate_history: {
        Row: {
          barbershop_id: string
          changed_at: string
          changed_by_user_id: string
          id: string
          new_rate_percent: number
          old_rate_percent: number | null
          professional_id: string
        }
        Insert: {
          barbershop_id: string
          changed_at?: string
          changed_by_user_id: string
          id?: string
          new_rate_percent: number
          old_rate_percent?: number | null
          professional_id: string
        }
        Update: {
          barbershop_id?: string
          changed_at?: string
          changed_by_user_id?: string
          id?: string
          new_rate_percent?: number
          old_rate_percent?: number | null
          professional_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "commission_rate_history_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_rate_history_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_rate_history_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      gallery: {
        Row: {
          barbershop_id: string
          created_at: string
          description: string | null
          display_order: number | null
          id: string
          image_url: string
          title: string | null
          updated_at: string
        }
        Insert: {
          barbershop_id: string
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          image_url: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          barbershop_id?: string
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gallery_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gallery_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops_public"
            referencedColumns: ["id"]
          },
        ]
      }
      gallery_images: {
        Row: {
          barbershop_id: string
          caption: string | null
          created_at: string
          id: string
          image_url: string
          order_index: number | null
        }
        Insert: {
          barbershop_id: string
          caption?: string | null
          created_at?: string
          id?: string
          image_url: string
          order_index?: number | null
        }
        Update: {
          barbershop_id?: string
          caption?: string | null
          created_at?: string
          id?: string
          image_url?: string
          order_index?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "gallery_images_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gallery_images_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops_public"
            referencedColumns: ["id"]
          },
        ]
      }
      import_logs: {
        Row: {
          barbershop_id: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          error_count: number | null
          error_details: Json | null
          filename: string
          id: string
          import_type: string
          status: string
          success_count: number | null
          total_records: number | null
        }
        Insert: {
          barbershop_id: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          error_count?: number | null
          error_details?: Json | null
          filename: string
          id?: string
          import_type: string
          status?: string
          success_count?: number | null
          total_records?: number | null
        }
        Update: {
          barbershop_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          error_count?: number | null
          error_details?: Json | null
          filename?: string
          id?: string
          import_type?: string
          status?: string
          success_count?: number | null
          total_records?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "import_logs_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_logs_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops_public"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_logs: {
        Row: {
          barbershop_id: string
          channel: string
          content: string | null
          created_at: string
          error_message: string | null
          id: string
          recipient_contact: string
          recipient_id: string | null
          sent_at: string | null
          status: string
          template_id: string | null
        }
        Insert: {
          barbershop_id: string
          channel: string
          content?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          recipient_contact: string
          recipient_id?: string | null
          sent_at?: string | null
          status?: string
          template_id?: string | null
        }
        Update: {
          barbershop_id?: string
          channel?: string
          content?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          recipient_contact?: string
          recipient_id?: string | null
          sent_at?: string | null
          status?: string
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_logs_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_logs_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops_public"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_settings: {
        Row: {
          admin_email: string | null
          admin_whatsapp: string | null
          ai_enabled: boolean | null
          barbershop_id: string | null
          created_at: string | null
          custom_message: string | null
          enabled: boolean | null
          id: string
          push_enabled: boolean | null
          reminder_minutes: number | null
          send_sms: boolean | null
          send_to_client: boolean | null
          send_whatsapp: boolean | null
          updated_at: string | null
        }
        Insert: {
          admin_email?: string | null
          admin_whatsapp?: string | null
          ai_enabled?: boolean | null
          barbershop_id?: string | null
          created_at?: string | null
          custom_message?: string | null
          enabled?: boolean | null
          id?: string
          push_enabled?: boolean | null
          reminder_minutes?: number | null
          send_sms?: boolean | null
          send_to_client?: boolean | null
          send_whatsapp?: boolean | null
          updated_at?: string | null
        }
        Update: {
          admin_email?: string | null
          admin_whatsapp?: string | null
          ai_enabled?: boolean | null
          barbershop_id?: string | null
          created_at?: string | null
          custom_message?: string | null
          enabled?: boolean | null
          id?: string
          push_enabled?: boolean | null
          reminder_minutes?: number | null
          send_sms?: boolean | null
          send_to_client?: boolean | null
          send_whatsapp?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_settings_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_settings_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops_public"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_templates: {
        Row: {
          barbershop_id: string
          content: string
          created_at: string
          id: string
          is_active: boolean | null
          name: string
          subject: string | null
          trigger_event: string
          type: string
          updated_at: string
        }
        Insert: {
          barbershop_id: string
          content: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          name: string
          subject?: string | null
          trigger_event: string
          type?: string
          updated_at?: string
        }
        Update: {
          barbershop_id?: string
          content?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          name?: string
          subject?: string | null
          trigger_event?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_templates_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_templates_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops_public"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          barbershop_id: string | null
          booking_id: string | null
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          read: boolean | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          barbershop_id?: string | null
          booking_id?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          read?: boolean | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          barbershop_id?: string | null
          booking_id?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          read?: boolean | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_transactions: {
        Row: {
          amount: number
          barbershop_id: string | null
          client_id: string
          created_at: string | null
          id: string
          mercadopago_status: string | null
          payment_method: string | null
          plan_id: string | null
          preference_id: string | null
          raw_response: Json | null
          status: string | null
          subscription_id: string | null
          transaction_id: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          barbershop_id?: string | null
          client_id: string
          created_at?: string | null
          id?: string
          mercadopago_status?: string | null
          payment_method?: string | null
          plan_id?: string | null
          preference_id?: string | null
          raw_response?: Json | null
          status?: string | null
          subscription_id?: string | null
          transaction_id?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          barbershop_id?: string | null
          client_id?: string
          created_at?: string | null
          id?: string
          mercadopago_status?: string | null
          payment_method?: string | null
          plan_id?: string | null
          preference_id?: string | null
          raw_response?: Json | null
          status?: string | null
          subscription_id?: string | null
          transaction_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_transactions_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops_public"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_activity_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          performed_by: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          performed_by?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          performed_by?: string | null
        }
        Relationships: []
      }
      platform_plans: {
        Row: {
          billing_cycle: string
          created_at: string
          description: string | null
          features: Json | null
          id: string
          is_active: boolean | null
          max_professionals: number | null
          max_services: number | null
          name: string
          price: number
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          billing_cycle?: string
          created_at?: string
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          max_professionals?: number | null
          max_services?: number | null
          name: string
          price: number
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          billing_cycle?: string
          created_at?: string
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          max_professionals?: number | null
          max_services?: number | null
          name?: string
          price?: number
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      professional_availability: {
        Row: {
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          is_available: boolean
          professional_id: string
          start_time: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          is_available?: boolean
          professional_id: string
          start_time: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          is_available?: boolean
          professional_id?: string
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "professional_availability_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      professional_commissions: {
        Row: {
          barbershop_id: string
          commission_rate: number
          created_at: string
          id: string
          professional_id: string
          updated_at: string
        }
        Insert: {
          barbershop_id: string
          commission_rate?: number
          created_at?: string
          id?: string
          professional_id: string
          updated_at?: string
        }
        Update: {
          barbershop_id?: string
          commission_rate?: number
          created_at?: string
          id?: string
          professional_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "professional_commissions_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_commissions_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_commissions_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      professional_time_blocks: {
        Row: {
          block_date: string | null
          block_type: string
          created_at: string
          day_of_week: number | null
          end_time: string
          id: string
          is_recurring: boolean
          notes: string | null
          professional_id: string
          start_time: string
          title: string
          updated_at: string
        }
        Insert: {
          block_date?: string | null
          block_type?: string
          created_at?: string
          day_of_week?: number | null
          end_time: string
          id?: string
          is_recurring?: boolean
          notes?: string | null
          professional_id: string
          start_time: string
          title?: string
          updated_at?: string
        }
        Update: {
          block_date?: string | null
          block_type?: string
          created_at?: string
          day_of_week?: number | null
          end_time?: string
          id?: string
          is_recurring?: boolean
          notes?: string | null
          professional_id?: string
          start_time?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "professional_time_blocks_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      professionals: {
        Row: {
          barbershop_id: string
          bio: string | null
          commission_percentage: number | null
          created_at: string
          id: string
          is_active: boolean | null
          name: string
          photo_url: string | null
          rating: number | null
          specialties: string[] | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          barbershop_id: string
          bio?: string | null
          commission_percentage?: number | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          name: string
          photo_url?: string | null
          rating?: number | null
          specialties?: string[] | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          barbershop_id?: string
          bio?: string | null
          commission_percentage?: number | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          name?: string
          photo_url?: string | null
          rating?: number | null
          specialties?: string[] | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "professionals_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professionals_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professionals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          is_active: boolean | null
          name: string | null
          phone: string | null
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          is_active?: boolean | null
          name?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          is_active?: boolean | null
          name?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      registration_codes: {
        Row: {
          code: string
          created_at: string | null
          expires_at: string | null
          id: string
          is_used: boolean | null
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_used?: boolean | null
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_used?: boolean | null
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: []
      }
      service_addons: {
        Row: {
          barbershop_id: string
          created_at: string
          description: string | null
          duration_minutes: number
          id: string
          is_active: boolean | null
          name: string
          price: number
          updated_at: string
        }
        Insert: {
          barbershop_id: string
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean | null
          name: string
          price?: number
          updated_at?: string
        }
        Update: {
          barbershop_id?: string
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean | null
          name?: string
          price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_addons_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_addons_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops_public"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          barbershop_id: string
          created_at: string
          description: string | null
          duration_minutes: number
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          price: number
          updated_at: string
        }
        Insert: {
          barbershop_id: string
          created_at?: string
          description?: string | null
          duration_minutes: number
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          price: number
          updated_at?: string
        }
        Update: {
          barbershop_id?: string
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops_public"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          barbershop_id: string
          benefits: string[] | null
          billing_period: string | null
          created_at: string | null
          description: string | null
          discount_percentage: number | null
          duration_days: number
          highlight_label: string | null
          id: string
          is_active: boolean | null
          is_highlighted: boolean | null
          max_professionals: number | null
          max_services_per_month: number | null
          name: string
          original_price: number | null
          price: number
          services_included: string[] | null
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          barbershop_id: string
          benefits?: string[] | null
          billing_period?: string | null
          created_at?: string | null
          description?: string | null
          discount_percentage?: number | null
          duration_days?: number
          highlight_label?: string | null
          id?: string
          is_active?: boolean | null
          is_highlighted?: boolean | null
          max_professionals?: number | null
          max_services_per_month?: number | null
          name: string
          original_price?: number | null
          price: number
          services_included?: string[] | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          barbershop_id?: string
          benefits?: string[] | null
          billing_period?: string | null
          created_at?: string | null
          description?: string | null
          discount_percentage?: number | null
          duration_days?: number
          highlight_label?: string | null
          id?: string
          is_active?: boolean | null
          is_highlighted?: boolean | null
          max_professionals?: number | null
          max_services_per_month?: number | null
          name?: string
          original_price?: number | null
          price?: number
          services_included?: string[] | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscription_plans_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_plans_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops_public"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_usage: {
        Row: {
          booking_id: string
          id: string
          subscription_id: string
          used_at: string | null
        }
        Insert: {
          booking_id: string
          id?: string
          subscription_id: string
          used_at?: string | null
        }
        Update: {
          booking_id?: string
          id?: string
          subscription_id?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscription_usage_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_usage_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "client_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      tutorial_images: {
        Row: {
          barbershop_id: string | null
          category_id: string
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          step_order: number | null
          title: string
          tutorial_id: string
          updated_at: string | null
        }
        Insert: {
          barbershop_id?: string | null
          category_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          step_order?: number | null
          title: string
          tutorial_id: string
          updated_at?: string | null
        }
        Update: {
          barbershop_id?: string | null
          category_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          step_order?: number | null
          title?: string
          tutorial_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tutorial_images_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tutorial_images_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops_public"
            referencedColumns: ["id"]
          },
        ]
      }
      tutorial_videos: {
        Row: {
          barbershop_id: string | null
          category_icon: string
          category_id: string
          category_title: string
          created_at: string | null
          description: string | null
          display_order: number | null
          duration: string | null
          id: string
          is_active: boolean | null
          order_index: number | null
          thumbnail_url: string | null
          title: string
          updated_at: string | null
          video_url: string | null
        }
        Insert: {
          barbershop_id?: string | null
          category_icon?: string
          category_id: string
          category_title: string
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          duration?: string | null
          id?: string
          is_active?: boolean | null
          order_index?: number | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string | null
          video_url?: string | null
        }
        Update: {
          barbershop_id?: string | null
          category_icon?: string
          category_id?: string
          category_title?: string
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          duration?: string | null
          id?: string
          is_active?: boolean | null
          order_index?: number | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tutorial_videos_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tutorial_videos_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops_public"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          barbershop_id: string | null
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          barbershop_id?: string | null
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          barbershop_id?: string | null
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops_public"
            referencedColumns: ["id"]
          },
        ]
      }
      waiting_list: {
        Row: {
          barbershop_id: string
          client_id: string | null
          client_name: string
          client_phone: string | null
          created_at: string
          id: string
          notes: string | null
          preferred_date: string | null
          preferred_time_end: string | null
          preferred_time_start: string | null
          professional_id: string | null
          service_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          barbershop_id: string
          client_id?: string | null
          client_name: string
          client_phone?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          preferred_date?: string | null
          preferred_time_end?: string | null
          preferred_time_start?: string | null
          professional_id?: string | null
          service_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          barbershop_id?: string
          client_id?: string | null
          client_name?: string
          client_phone?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          preferred_date?: string | null
          preferred_time_end?: string | null
          preferred_time_start?: string | null
          professional_id?: string | null
          service_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "waiting_list_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waiting_list_barbershop_id_fkey"
            columns: ["barbershop_id"]
            isOneToOne: false
            referencedRelation: "barbershops_public"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      barbershops_public: {
        Row: {
          address: string | null
          business_hours: Json | null
          closing_time: string | null
          cover_url: string | null
          created_at: string | null
          description: string | null
          id: string | null
          is_active: boolean | null
          logo_url: string | null
          mensagem_personalizada: string | null
          name: string | null
          opening_days: string[] | null
          opening_time: string | null
          primary_color: string | null
          slug: string | null
          theme_primary_color: string | null
          theme_secondary_color: string | null
        }
        Insert: {
          address?: string | null
          business_hours?: Json | null
          closing_time?: string | null
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string | null
          is_active?: boolean | null
          logo_url?: string | null
          mensagem_personalizada?: string | null
          name?: string | null
          opening_days?: string[] | null
          opening_time?: string | null
          primary_color?: string | null
          slug?: string | null
          theme_primary_color?: string | null
          theme_secondary_color?: string | null
        }
        Update: {
          address?: string | null
          business_hours?: Json | null
          closing_time?: string | null
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string | null
          is_active?: boolean | null
          logo_url?: string | null
          mensagem_personalizada?: string | null
          name?: string | null
          opening_days?: string[] | null
          opening_time?: string | null
          primary_color?: string | null
          slug?: string | null
          theme_primary_color?: string | null
          theme_secondary_color?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      can_view_profile: {
        Args: { _profile_id: string; _viewer_id: string }
        Returns: boolean
      }
      expire_subscriptions: { Args: never; Returns: undefined }
      generate_barbershop_slug: { Args: { name: string }; Returns: string }
      has_active_subscription: {
        Args: {
          _barbershop_id: string
          _client_id: string
          _service_id: string
        }
        Returns: {
          can_use: boolean
          has_subscription: boolean
          services_remaining: number
          subscription_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_barbershop_admin: {
        Args: { _barbershop_id: string; _user_id: string }
        Returns: boolean
      }
      is_barbershop_staff: {
        Args: { _barbershop_id: string; _user_id: string }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "barber" | "client" | "super_admin"
      commission_payment_status: "PENDING" | "PAID"
      commission_source_type: "APPOINTMENT" | "ORDER" | "INVOICE" | "OTHER"
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
      app_role: ["admin", "barber", "client", "super_admin"],
      commission_payment_status: ["PENDING", "PAID"],
      commission_source_type: ["APPOINTMENT", "ORDER", "INVOICE", "OTHER"],
    },
  },
} as const
