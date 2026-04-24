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
      account_deletion_requests: {
        Row: {
          admin_notes: string | null
          id: string
          processed_at: string | null
          processed_by: string | null
          reason: string | null
          requested_at: string
          status: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          id?: string
          processed_at?: string | null
          processed_by?: string | null
          reason?: string | null
          requested_at?: string
          status?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          id?: string
          processed_at?: string | null
          processed_by?: string | null
          reason?: string | null
          requested_at?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      admin_client_allocations: {
        Row: {
          admin_user_id: string
          client_profile_id: string
          created_at: string
          created_by: string | null
          id: string
        }
        Insert: {
          admin_user_id: string
          client_profile_id: string
          created_at?: string
          created_by?: string | null
          id?: string
        }
        Update: {
          admin_user_id?: string
          client_profile_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_client_allocations_client_profile_id_fkey"
            columns: ["client_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_settings: {
        Row: {
          bank_account_holder: string | null
          bank_bic: string | null
          bank_iban: string | null
          bank_name: string | null
          id: string
          slot_duration_minutes: number
          timezone: string
          updated_at: string
          working_days: number[]
          working_hours_end: number
          working_hours_start: number
        }
        Insert: {
          bank_account_holder?: string | null
          bank_bic?: string | null
          bank_iban?: string | null
          bank_name?: string | null
          id?: string
          slot_duration_minutes?: number
          timezone?: string
          updated_at?: string
          working_days?: number[]
          working_hours_end?: number
          working_hours_start?: number
        }
        Update: {
          bank_account_holder?: string | null
          bank_bic?: string | null
          bank_iban?: string | null
          bank_name?: string | null
          id?: string
          slot_duration_minutes?: number
          timezone?: string
          updated_at?: string
          working_days?: number[]
          working_hours_end?: number
          working_hours_start?: number
        }
        Relationships: []
      }
      appointments: {
        Row: {
          admin_id: string | null
          client_id: string
          created_at: string
          google_event_id: string | null
          id: string
          notes: string | null
          slot_end: string
          slot_start: string
          status: Database["public"]["Enums"]["appointment_status"]
          updated_at: string
        }
        Insert: {
          admin_id?: string | null
          client_id: string
          created_at?: string
          google_event_id?: string | null
          id?: string
          notes?: string | null
          slot_end: string
          slot_start: string
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string
        }
        Update: {
          admin_id?: string | null
          client_id?: string
          created_at?: string
          google_event_id?: string | null
          id?: string
          notes?: string | null
          slot_end?: string
          slot_start?: string
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_services: {
        Row: {
          assigned_admin_id: string | null
          client_id: string
          created_at: string
          currency: string | null
          id: string
          notes: string | null
          payment_status: Database["public"]["Enums"]["client_service_payment_status"]
          price_cents: number | null
          progress_percentage: number
          quantity: number
          service_catalogue_id: string
          status: Database["public"]["Enums"]["service_status"]
          updated_at: string
          vat_rate: number | null
        }
        Insert: {
          assigned_admin_id?: string | null
          client_id: string
          created_at?: string
          currency?: string | null
          id?: string
          notes?: string | null
          payment_status?: Database["public"]["Enums"]["client_service_payment_status"]
          price_cents?: number | null
          progress_percentage?: number
          quantity?: number
          service_catalogue_id: string
          status?: Database["public"]["Enums"]["service_status"]
          updated_at?: string
          vat_rate?: number | null
        }
        Update: {
          assigned_admin_id?: string | null
          client_id?: string
          created_at?: string
          currency?: string | null
          id?: string
          notes?: string | null
          payment_status?: Database["public"]["Enums"]["client_service_payment_status"]
          price_cents?: number | null
          progress_percentage?: number
          quantity?: number
          service_catalogue_id?: string
          status?: Database["public"]["Enums"]["service_status"]
          updated_at?: string
          vat_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "client_services_assigned_admin_id_fkey"
            columns: ["assigned_admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_services_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_services_service_catalogue_id_fkey"
            columns: ["service_catalogue_id"]
            isOneToOne: false
            referencedRelation: "service_catalogue"
            referencedColumns: ["id"]
          },
        ]
      }
      consent_log: {
        Row: {
          consent_type: string
          created_at: string
          granted: boolean
          id: string
          ip_address: string | null
          metadata: Json | null
          policy_version: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          consent_type: string
          created_at?: string
          granted?: boolean
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          policy_version: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          consent_type?: string
          created_at?: string
          granted?: boolean
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          policy_version?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      contracts: {
        Row: {
          client_id: string
          contract_file_name: string
          contract_file_path: string
          contract_file_size: number | null
          contract_mime_type: string | null
          created_at: string
          id: string
          marked_signed_at: string | null
          marked_signed_by_admin_id: string | null
          notes: string | null
          sealed_at: string | null
          signature_drawn_data_url: string | null
          signature_hash: string | null
          signature_method: string | null
          signature_typed_name: string | null
          signed_at: string | null
          signed_file_name: string | null
          signed_file_path: string | null
          signed_ip: string | null
          signed_user_agent: string | null
          status: string
          updated_at: string
          uploaded_by_admin_id: string | null
        }
        Insert: {
          client_id: string
          contract_file_name: string
          contract_file_path: string
          contract_file_size?: number | null
          contract_mime_type?: string | null
          created_at?: string
          id?: string
          marked_signed_at?: string | null
          marked_signed_by_admin_id?: string | null
          notes?: string | null
          sealed_at?: string | null
          signature_drawn_data_url?: string | null
          signature_hash?: string | null
          signature_method?: string | null
          signature_typed_name?: string | null
          signed_at?: string | null
          signed_file_name?: string | null
          signed_file_path?: string | null
          signed_ip?: string | null
          signed_user_agent?: string | null
          status?: string
          updated_at?: string
          uploaded_by_admin_id?: string | null
        }
        Update: {
          client_id?: string
          contract_file_name?: string
          contract_file_path?: string
          contract_file_size?: number | null
          contract_mime_type?: string | null
          created_at?: string
          id?: string
          marked_signed_at?: string | null
          marked_signed_by_admin_id?: string | null
          notes?: string | null
          sealed_at?: string | null
          signature_drawn_data_url?: string | null
          signature_hash?: string | null
          signature_method?: string | null
          signature_typed_name?: string | null
          signed_at?: string | null
          signed_file_name?: string | null
          signed_file_path?: string | null
          signed_ip?: string | null
          signed_user_agent?: string | null
          status?: string
          updated_at?: string
          uploaded_by_admin_id?: string | null
        }
        Relationships: []
      }
      conversations: {
        Row: {
          admin_id: string | null
          client_id: string
          created_at: string
          id: string
          last_message_at: string
          status: Database["public"]["Enums"]["conversation_status"]
          subject: string | null
        }
        Insert: {
          admin_id?: string | null
          client_id: string
          created_at?: string
          id?: string
          last_message_at?: string
          status?: Database["public"]["Enums"]["conversation_status"]
          subject?: string | null
        }
        Update: {
          admin_id?: string | null
          client_id?: string
          created_at?: string
          id?: string
          last_message_at?: string
          status?: Database["public"]["Enums"]["conversation_status"]
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      data_breach_incidents: {
        Row: {
          affected_data_categories: string[] | null
          affected_user_count: number | null
          closed_at: string | null
          cnpd_notified_at: string | null
          containment_actions: string | null
          created_at: string
          data_subjects_notified_at: string | null
          description: string
          detected_at: string
          id: string
          notify_deadline_at: string
          remediation_actions: string | null
          reported_by_admin_id: string | null
          severity: Database["public"]["Enums"]["breach_severity"]
          status: Database["public"]["Enums"]["breach_status"]
          title: string
          updated_at: string
        }
        Insert: {
          affected_data_categories?: string[] | null
          affected_user_count?: number | null
          closed_at?: string | null
          cnpd_notified_at?: string | null
          containment_actions?: string | null
          created_at?: string
          data_subjects_notified_at?: string | null
          description: string
          detected_at?: string
          id?: string
          notify_deadline_at?: string
          remediation_actions?: string | null
          reported_by_admin_id?: string | null
          severity?: Database["public"]["Enums"]["breach_severity"]
          status?: Database["public"]["Enums"]["breach_status"]
          title: string
          updated_at?: string
        }
        Update: {
          affected_data_categories?: string[] | null
          affected_user_count?: number | null
          closed_at?: string | null
          cnpd_notified_at?: string | null
          containment_actions?: string | null
          created_at?: string
          data_subjects_notified_at?: string | null
          description?: string
          detected_at?: string
          id?: string
          notify_deadline_at?: string
          remediation_actions?: string | null
          reported_by_admin_id?: string | null
          severity?: Database["public"]["Enums"]["breach_severity"]
          status?: Database["public"]["Enums"]["breach_status"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      data_subject_requests: {
        Row: {
          created_at: string
          details: string | null
          due_at: string
          export_file_path: string | null
          id: string
          request_type: Database["public"]["Enums"]["dsr_type"]
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: Database["public"]["Enums"]["dsr_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          due_at?: string
          export_file_path?: string | null
          id?: string
          request_type: Database["public"]["Enums"]["dsr_type"]
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["dsr_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          details?: string | null
          due_at?: string
          export_file_path?: string | null
          id?: string
          request_type?: Database["public"]["Enums"]["dsr_type"]
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["dsr_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      document_audit_log: {
        Row: {
          action: string
          actor_role: string
          actor_user_id: string | null
          created_at: string
          document_id: string | null
          document_request_id: string | null
          file_name: string | null
          file_path: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          target_user_id: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_role?: string
          actor_user_id?: string | null
          created_at?: string
          document_id?: string | null
          document_request_id?: string | null
          file_name?: string | null
          file_path?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          target_user_id?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_role?: string
          actor_user_id?: string | null
          created_at?: string
          document_id?: string | null
          document_request_id?: string | null
          file_name?: string | null
          file_path?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          target_user_id?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      document_download_permissions: {
        Row: {
          admin_user_id: string
          authorised: boolean
          created_at: string
          created_by: string | null
          document_id: string
          id: string
        }
        Insert: {
          admin_user_id: string
          authorised?: boolean
          created_at?: string
          created_by?: string | null
          document_id: string
          id?: string
        }
        Update: {
          admin_user_id?: string
          authorised?: boolean
          created_at?: string
          created_by?: string | null
          document_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_download_permissions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      document_requests: {
        Row: {
          client_id: string
          created_at: string
          description: string | null
          document_name: string
          id: string
          required: boolean
          service_id: string | null
          uploaded_at: string | null
          uploaded_by: string | null
          uploaded_file_url: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          description?: string | null
          document_name: string
          id?: string
          required?: boolean
          service_id?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
          uploaded_file_url?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          description?: string | null
          document_name?: string
          id?: string
          required?: boolean
          service_id?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
          uploaded_file_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_requests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_requests_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "client_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_requests_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          category: string
          created_at: string
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          mime_type: string | null
          retention_until: string | null
          sha256_hash: string | null
          updated_at: string
          uploaded_by_admin_id: string | null
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          retention_until?: string | null
          sha256_hash?: string | null
          updated_at?: string
          uploaded_by_admin_id?: string | null
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          retention_until?: string | null
          sha256_hash?: string | null
          updated_at?: string
          uploaded_by_admin_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      invoices: {
        Row: {
          amount_cents: number
          client_id: string
          client_service_id: string | null
          created_at: string
          created_by_admin_id: string | null
          currency: string
          description: string
          discount_percentage: number
          id: string
          moloni_document_id: string | null
          moloni_document_number: string | null
          moloni_error: string | null
          moloni_issued_at: string | null
          moloni_pdf_url: string | null
          notes: string | null
          paid_at: string | null
          refunded_amount_cents: number
          status: Database["public"]["Enums"]["invoice_status"]
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          updated_at: string
          vat_rate: number
        }
        Insert: {
          amount_cents: number
          client_id: string
          client_service_id?: string | null
          created_at?: string
          created_by_admin_id?: string | null
          currency?: string
          description: string
          discount_percentage?: number
          id?: string
          moloni_document_id?: string | null
          moloni_document_number?: string | null
          moloni_error?: string | null
          moloni_issued_at?: string | null
          moloni_pdf_url?: string | null
          notes?: string | null
          paid_at?: string | null
          refunded_amount_cents?: number
          status?: Database["public"]["Enums"]["invoice_status"]
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          updated_at?: string
          vat_rate?: number
        }
        Update: {
          amount_cents?: number
          client_id?: string
          client_service_id?: string | null
          created_at?: string
          created_by_admin_id?: string | null
          currency?: string
          description?: string
          discount_percentage?: number
          id?: string
          moloni_document_id?: string | null
          moloni_document_number?: string | null
          moloni_error?: string | null
          moloni_issued_at?: string | null
          moloni_pdf_url?: string | null
          notes?: string | null
          paid_at?: string | null
          refunded_amount_cents?: number
          status?: Database["public"]["Enums"]["invoice_status"]
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          updated_at?: string
          vat_rate?: number
        }
        Relationships: []
      }
      messages: {
        Row: {
          body: string
          conversation_id: string
          created_at: string
          id: string
          read: boolean
          sender_id: string
        }
        Insert: {
          body: string
          conversation_id: string
          created_at?: string
          id?: string
          read?: boolean
          sender_id: string
        }
        Update: {
          body?: string
          conversation_id?: string
          created_at?: string
          id?: string
          read?: boolean
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_cents: number
          client_id: string | null
          created_at: string
          currency: string
          id: string
          invoice_id: string | null
          payment_method: string | null
          raw_event: Json | null
          status: string
          stripe_checkout_session_id: string | null
          stripe_event_id: string | null
          stripe_payment_intent_id: string | null
        }
        Insert: {
          amount_cents: number
          client_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          invoice_id?: string | null
          payment_method?: string | null
          raw_event?: Json | null
          status: string
          stripe_checkout_session_id?: string | null
          stripe_event_id?: string | null
          stripe_payment_intent_id?: string | null
        }
        Update: {
          amount_cents?: number
          client_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          invoice_id?: string | null
          payment_method?: string | null
          raw_event?: Json | null
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_event_id?: string | null
          stripe_payment_intent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_audit_log: {
        Row: {
          changed_by_user_id: string | null
          changed_fields: Json
          created_at: string
          id: string
          new_values: Json | null
          old_values: Json | null
          profile_id: string
        }
        Insert: {
          changed_by_user_id?: string | null
          changed_fields: Json
          created_at?: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          profile_id: string
        }
        Update: {
          changed_by_user_id?: string | null
          changed_fields?: Json
          created_at?: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          profile_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          company_name: string | null
          created_at: string
          date_of_birth: string | null
          first_name: string | null
          full_name: string | null
          id: string
          last_name: string | null
          lifecycle_status: string
          meet_link: string | null
          nationality: string | null
          nif: string | null
          onboarding_completed: boolean
          phone_number: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company_name?: string | null
          created_at?: string
          date_of_birth?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          last_name?: string | null
          lifecycle_status?: string
          meet_link?: string | null
          nationality?: string | null
          nif?: string | null
          onboarding_completed?: boolean
          phone_number?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          company_name?: string | null
          created_at?: string
          date_of_birth?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          last_name?: string | null
          lifecycle_status?: string
          meet_link?: string | null
          nationality?: string | null
          nif?: string | null
          onboarding_completed?: boolean
          phone_number?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      refunds: {
        Row: {
          amount_cents: number
          client_id: string
          created_at: string
          currency: string
          id: string
          invoice_id: string
          issued_by_admin_id: string | null
          moloni_credit_note_id: string | null
          moloni_credit_note_number: string | null
          moloni_credit_note_pdf_url: string | null
          moloni_error: string | null
          reason: string | null
          status: string
          stripe_refund_id: string | null
          updated_at: string
        }
        Insert: {
          amount_cents: number
          client_id: string
          created_at?: string
          currency?: string
          id?: string
          invoice_id: string
          issued_by_admin_id?: string | null
          moloni_credit_note_id?: string | null
          moloni_credit_note_number?: string | null
          moloni_credit_note_pdf_url?: string | null
          moloni_error?: string | null
          reason?: string | null
          status?: string
          stripe_refund_id?: string | null
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          client_id?: string
          created_at?: string
          currency?: string
          id?: string
          invoice_id?: string
          issued_by_admin_id?: string | null
          moloni_credit_note_id?: string | null
          moloni_credit_note_number?: string | null
          moloni_credit_note_pdf_url?: string | null
          moloni_error?: string | null
          reason?: string | null
          status?: string
          stripe_refund_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "refunds_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      service_catalogue: {
        Row: {
          active: boolean
          category: string
          created_at: string
          currency: string
          description: string | null
          id: string
          name: string
          price_cents: number | null
          vat_rate: number
        }
        Insert: {
          active?: boolean
          category: string
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          name: string
          price_cents?: number | null
          vat_rate?: number
        }
        Update: {
          active?: boolean
          category?: string
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          name?: string
          price_cents?: number | null
          vat_rate?: number
        }
        Relationships: []
      }
      service_requests: {
        Row: {
          client_id: string
          client_note: string | null
          created_at: string
          decision_note: string | null
          id: string
          reviewed_at: string | null
          reviewed_by_admin_id: string | null
          service_catalogue_id: string
          status: Database["public"]["Enums"]["service_request_status"]
          updated_at: string
        }
        Insert: {
          client_id: string
          client_note?: string | null
          created_at?: string
          decision_note?: string | null
          id?: string
          reviewed_at?: string | null
          reviewed_by_admin_id?: string | null
          service_catalogue_id: string
          status?: Database["public"]["Enums"]["service_request_status"]
          updated_at?: string
        }
        Update: {
          client_id?: string
          client_note?: string | null
          created_at?: string
          decision_note?: string | null
          id?: string
          reviewed_at?: string | null
          reviewed_by_admin_id?: string | null
          service_catalogue_id?: string
          status?: Database["public"]["Enums"]["service_request_status"]
          updated_at?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      survey_answer_history: {
        Row: {
          answer_id: string
          assignment_id: string
          changed_at: string
          changed_by_user_id: string | null
          id: string
          previous_answer: Json | null
          question_id: string
        }
        Insert: {
          answer_id: string
          assignment_id: string
          changed_at?: string
          changed_by_user_id?: string | null
          id?: string
          previous_answer?: Json | null
          question_id: string
        }
        Update: {
          answer_id?: string
          assignment_id?: string
          changed_at?: string
          changed_by_user_id?: string | null
          id?: string
          previous_answer?: Json | null
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_answer_history_answer_id_fkey"
            columns: ["answer_id"]
            isOneToOne: false
            referencedRelation: "survey_answers"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_answers: {
        Row: {
          answer: Json | null
          assignment_id: string
          created_at: string
          id: string
          question_id: string
          updated_at: string
          updated_by_user_id: string | null
        }
        Insert: {
          answer?: Json | null
          assignment_id: string
          created_at?: string
          id?: string
          question_id: string
          updated_at?: string
          updated_by_user_id?: string | null
        }
        Update: {
          answer?: Json | null
          assignment_id?: string
          created_at?: string
          id?: string
          question_id?: string
          updated_at?: string
          updated_by_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "survey_answers_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "survey_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "survey_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_assignments: {
        Row: {
          assigned_at: string
          assigned_by_user_id: string | null
          client_profile_id: string
          id: string
          template_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by_user_id?: string | null
          client_profile_id: string
          id?: string
          template_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by_user_id?: string | null
          client_profile_id?: string
          id?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_assignments_client_profile_id_fkey"
            columns: ["client_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_assignments_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "survey_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_questions: {
        Row: {
          created_at: string
          id: string
          options: Json
          position: number
          question_text: string
          question_type: Database["public"]["Enums"]["survey_question_type"]
          required: boolean
          template_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          options?: Json
          position?: number
          question_text: string
          question_type: Database["public"]["Enums"]["survey_question_type"]
          required?: boolean
          template_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          options?: Json
          position?: number
          question_text?: string
          question_type?: Database["public"]["Enums"]["survey_question_type"]
          required?: boolean
          template_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_questions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "survey_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_templates: {
        Row: {
          active: boolean
          created_at: string
          created_by_user_id: string | null
          description: string | null
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by_user_id?: string | null
          description?: string | null
          id?: string
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by_user_id?: string | null
          description?: string | null
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      unauthorised_download_attempts: {
        Row: {
          acknowledged: boolean
          admin_user_id: string
          attempted_at: string
          client_profile_id: string | null
          document_id: string | null
          document_name: string | null
          id: string
        }
        Insert: {
          acknowledged?: boolean
          admin_user_id: string
          attempted_at?: string
          client_profile_id?: string | null
          document_id?: string | null
          document_name?: string | null
          id?: string
        }
        Update: {
          acknowledged?: boolean
          admin_user_id?: string
          attempted_at?: string
          client_profile_id?: string | null
          document_id?: string | null
          document_name?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "unauthorised_download_attempts_client_profile_id_fkey"
            columns: ["client_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unauthorised_download_attempts_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_can_download_document: {
        Args: { _admin_user_id: string; _document_id: string }
        Returns: boolean
      }
      admin_can_view_client: {
        Args: { _admin_user_id: string; _client_profile_id: string }
        Returns: boolean
      }
      bookable_admins_for_client: {
        Args: { _client_profile_id: string }
        Returns: {
          admin_profile_id: string
          admin_user_id: string
          company_name: string
          is_default: boolean
          meet_link: string
        }[]
      }
      current_profile_id: { Args: never; Returns: string }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      export_user_data: { Args: { _user_id: string }; Returns: Json }
      get_company_bank_details: {
        Args: never
        Returns: {
          bank_account_holder: string
          bank_bic: string
          bank_iban: string
          bank_name: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_or_super: { Args: { _user_id: string }; Returns: boolean }
      is_setlix_admin: { Args: { _user_id: string }; Returns: boolean }
      is_superadmin: { Args: { _user_id: string }; Returns: boolean }
      log_document_action: {
        Args: {
          _action: string
          _document_id?: string
          _document_request_id?: string
          _file_name?: string
          _file_path?: string
          _ip_address?: string
          _metadata?: Json
          _user_agent?: string
        }
        Returns: string
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
    }
    Enums: {
      app_role: "superadmin" | "admin" | "client"
      appointment_status: "pending" | "confirmed" | "cancelled"
      breach_severity: "low" | "medium" | "high" | "critical"
      breach_status:
        | "detected"
        | "assessing"
        | "contained"
        | "notified"
        | "closed"
      client_service_payment_status:
        | "unpaid"
        | "paid"
        | "refunded"
        | "not_required"
      conversation_status: "open" | "closed"
      dsr_status:
        | "pending"
        | "in_progress"
        | "fulfilled"
        | "rejected"
        | "withdrawn"
      dsr_type:
        | "access"
        | "rectification"
        | "erasure"
        | "portability"
        | "restriction"
        | "objection"
      invoice_status:
        | "draft"
        | "pending"
        | "paid"
        | "failed"
        | "refunded"
        | "cancelled"
        | "partially_refunded"
      service_request_status: "pending" | "approved" | "rejected"
      service_status:
        | "requested"
        | "in_review"
        | "in_progress"
        | "awaiting_client"
        | "completed"
      survey_question_type:
        | "short_text"
        | "long_text"
        | "single_choice"
        | "multiple_choice"
        | "yes_no"
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
      app_role: ["superadmin", "admin", "client"],
      appointment_status: ["pending", "confirmed", "cancelled"],
      breach_severity: ["low", "medium", "high", "critical"],
      breach_status: [
        "detected",
        "assessing",
        "contained",
        "notified",
        "closed",
      ],
      client_service_payment_status: [
        "unpaid",
        "paid",
        "refunded",
        "not_required",
      ],
      conversation_status: ["open", "closed"],
      dsr_status: [
        "pending",
        "in_progress",
        "fulfilled",
        "rejected",
        "withdrawn",
      ],
      dsr_type: [
        "access",
        "rectification",
        "erasure",
        "portability",
        "restriction",
        "objection",
      ],
      invoice_status: [
        "draft",
        "pending",
        "paid",
        "failed",
        "refunded",
        "cancelled",
        "partially_refunded",
      ],
      service_request_status: ["pending", "approved", "rejected"],
      service_status: [
        "requested",
        "in_review",
        "in_progress",
        "awaiting_client",
        "completed",
      ],
      survey_question_type: [
        "short_text",
        "long_text",
        "single_choice",
        "multiple_choice",
        "yes_no",
      ],
    },
  },
} as const
