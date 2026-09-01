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
      cleaner_payout_accounts: {
        Row: {
          age_18_confirmed_at: string | null
          country: string | null
          created_at: string
          onboarding_status: string
          payouts_enabled: boolean
          requirements_due: string[]
          stripe_account_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          age_18_confirmed_at?: string | null
          country?: string | null
          created_at?: string
          onboarding_status?: string
          payouts_enabled?: boolean
          requirements_due?: string[]
          stripe_account_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          age_18_confirmed_at?: string | null
          country?: string | null
          created_at?: string
          onboarding_status?: string
          payouts_enabled?: boolean
          requirements_due?: string[]
          stripe_account_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cleaner_payout_accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cleanup_admin_actions: {
        Row: {
          action: string
          admin_id: string | null
          case_id: string
          created_at: string
          id: string
          metadata: Json
          reason: string
        }
        Insert: {
          action: string
          admin_id?: string | null
          case_id: string
          created_at?: string
          id?: string
          metadata?: Json
          reason: string
        }
        Update: {
          action?: string
          admin_id?: string | null
          case_id?: string
          created_at?: string
          id?: string
          metadata?: Json
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "cleanup_admin_actions_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "cleanup_admin_memberships"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "cleanup_admin_actions_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cleanup_admin_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      cleanup_admin_cases: {
        Row: {
          assigned_to: string | null
          case_type: string
          cleanup_attempt_id: string | null
          context: Json
          contribution_id: string | null
          created_at: string
          id: string
          priority: number
          report_id: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          summary: string | null
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          case_type: string
          cleanup_attempt_id?: string | null
          context?: Json
          contribution_id?: string | null
          created_at?: string
          id?: string
          priority?: number
          report_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          summary?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          case_type?: string
          cleanup_attempt_id?: string | null
          context?: Json
          contribution_id?: string | null
          created_at?: string
          id?: string
          priority?: number
          report_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          summary?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cleanup_admin_cases_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "cleanup_admin_memberships"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "cleanup_admin_cases_cleanup_attempt_id_fkey"
            columns: ["cleanup_attempt_id"]
            isOneToOne: false
            referencedRelation: "cleanup_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cleanup_admin_cases_contribution_id_fkey"
            columns: ["contribution_id"]
            isOneToOne: false
            referencedRelation: "cleanup_contributions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cleanup_admin_cases_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cleanup_admin_cases_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "cleanup_admin_memberships"
            referencedColumns: ["user_id"]
          },
        ]
      }
      cleanup_admin_memberships: {
        Row: {
          active: boolean
          created_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cleanup_admin_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cleanup_ai_checks: {
        Row: {
          attempt_number: number
          check_kind: string
          cleanup_attempt_id: string | null
          completed_at: string | null
          created_at: string
          id: string
          image_hashes: string[]
          last_provider_error: string | null
          model: string | null
          prompt_version: string
          provider_attempts: number
          provider_started_at: string | null
          raw_result: Json | null
          reason_codes: string[]
          report_id: string
          status: string
          submission_id: string | null
          user_summary: string | null
        }
        Insert: {
          attempt_number?: number
          check_kind: string
          cleanup_attempt_id?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          image_hashes?: string[]
          last_provider_error?: string | null
          model?: string | null
          prompt_version: string
          provider_attempts?: number
          provider_started_at?: string | null
          raw_result?: Json | null
          reason_codes?: string[]
          report_id: string
          status?: string
          submission_id?: string | null
          user_summary?: string | null
        }
        Update: {
          attempt_number?: number
          check_kind?: string
          cleanup_attempt_id?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          image_hashes?: string[]
          last_provider_error?: string | null
          model?: string | null
          prompt_version?: string
          provider_attempts?: number
          provider_started_at?: string | null
          raw_result?: Json | null
          reason_codes?: string[]
          report_id?: string
          status?: string
          submission_id?: string | null
          user_summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cleanup_ai_checks_cleanup_attempt_id_fkey"
            columns: ["cleanup_attempt_id"]
            isOneToOne: false
            referencedRelation: "cleanup_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cleanup_ai_checks_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cleanup_ai_checks_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "cleanup_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      cleanup_attempts: {
        Row: {
          approval_method: string | null
          cancelled_at: string | null
          claim_expires_at: string
          claimed_at: string
          cleaner_id: string | null
          completed_at: string | null
          correction_due_at: string | null
          dispute_reason: string | null
          dispute_status: string
          disputed_at: string | null
          expired_at: string | null
          final_reviewer_id: string | null
          final_submission_id: string | null
          financial_review_attempts: number
          financial_review_status: string
          financial_review_summary: string | null
          first_paid_admin_status: string
          first_paid_cleanup: boolean
          first_submitted_at: string | null
          guidelines_version: string
          id: string
          is_paid: boolean
          is_self_cleanup: boolean
          last_activity_at: string
          latest_submitted_at: string | null
          payout_attempts: number
          payout_last_error: string | null
          payout_status: string
          released_at: string | null
          report_id: string
          reporter_id: string | null
          review_due_at: string | null
          reward_amount_cents: number
          status: string
          stripe_transfer_id: string | null
          waiver_version: string
        }
        Insert: {
          approval_method?: string | null
          cancelled_at?: string | null
          claim_expires_at: string
          claimed_at?: string
          cleaner_id?: string | null
          completed_at?: string | null
          correction_due_at?: string | null
          dispute_reason?: string | null
          dispute_status?: string
          disputed_at?: string | null
          expired_at?: string | null
          final_reviewer_id?: string | null
          final_submission_id?: string | null
          financial_review_attempts?: number
          financial_review_status?: string
          financial_review_summary?: string | null
          first_paid_admin_status?: string
          first_paid_cleanup?: boolean
          first_submitted_at?: string | null
          guidelines_version: string
          id?: string
          is_paid?: boolean
          is_self_cleanup?: boolean
          last_activity_at?: string
          latest_submitted_at?: string | null
          payout_attempts?: number
          payout_last_error?: string | null
          payout_status?: string
          released_at?: string | null
          report_id: string
          reporter_id?: string | null
          review_due_at?: string | null
          reward_amount_cents?: number
          status?: string
          stripe_transfer_id?: string | null
          waiver_version: string
        }
        Update: {
          approval_method?: string | null
          cancelled_at?: string | null
          claim_expires_at?: string
          claimed_at?: string
          cleaner_id?: string | null
          completed_at?: string | null
          correction_due_at?: string | null
          dispute_reason?: string | null
          dispute_status?: string
          disputed_at?: string | null
          expired_at?: string | null
          final_reviewer_id?: string | null
          final_submission_id?: string | null
          financial_review_attempts?: number
          financial_review_status?: string
          financial_review_summary?: string | null
          first_paid_admin_status?: string
          first_paid_cleanup?: boolean
          first_submitted_at?: string | null
          guidelines_version?: string
          id?: string
          is_paid?: boolean
          is_self_cleanup?: boolean
          last_activity_at?: string
          latest_submitted_at?: string | null
          payout_attempts?: number
          payout_last_error?: string | null
          payout_status?: string
          released_at?: string | null
          report_id?: string
          reporter_id?: string | null
          review_due_at?: string | null
          reward_amount_cents?: number
          status?: string
          stripe_transfer_id?: string | null
          waiver_version?: string
        }
        Relationships: [
          {
            foreignKeyName: "cleanup_attempts_cleaner_id_fkey"
            columns: ["cleaner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cleanup_attempts_final_reviewer_id_fkey"
            columns: ["final_reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cleanup_attempts_final_submission_fkey"
            columns: ["final_submission_id", "id"]
            isOneToOne: false
            referencedRelation: "cleanup_submissions"
            referencedColumns: ["id", "cleanup_attempt_id"]
          },
          {
            foreignKeyName: "cleanup_attempts_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cleanup_attempts_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cleanup_attempts_waiver_version_fkey"
            columns: ["waiver_version", "guidelines_version"]
            isOneToOne: false
            referencedRelation: "cleanup_waiver_versions"
            referencedColumns: ["waiver_version", "guidelines_version"]
          },
        ]
      }
      cleanup_contributions: {
        Row: {
          auto_refund_due_at: string | null
          cleanup_attempt_id: string | null
          client_request_id: string
          contributor_id: string | null
          created_at: string
          currency: string
          failure_code: string | null
          id: string
          platform_fee_cents: number
          principal_amount_cents: number
          refund_attempts: number
          refund_processing_started_at: string | null
          refund_requested_at: string | null
          refunded_at: string | null
          report_id: string
          status: string
          stripe_charge_id: string | null
          stripe_payment_intent_id: string | null
          stripe_refund_id: string | null
          succeeded_at: string | null
          total_amount_cents: number
          updated_at: string
        }
        Insert: {
          auto_refund_due_at?: string | null
          cleanup_attempt_id?: string | null
          client_request_id: string
          contributor_id?: string | null
          created_at?: string
          currency?: string
          failure_code?: string | null
          id?: string
          platform_fee_cents: number
          principal_amount_cents: number
          refund_attempts?: number
          refund_processing_started_at?: string | null
          refund_requested_at?: string | null
          refunded_at?: string | null
          report_id: string
          status?: string
          stripe_charge_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_refund_id?: string | null
          succeeded_at?: string | null
          total_amount_cents: number
          updated_at?: string
        }
        Update: {
          auto_refund_due_at?: string | null
          cleanup_attempt_id?: string | null
          client_request_id?: string
          contributor_id?: string | null
          created_at?: string
          currency?: string
          failure_code?: string | null
          id?: string
          platform_fee_cents?: number
          principal_amount_cents?: number
          refund_attempts?: number
          refund_processing_started_at?: string | null
          refund_requested_at?: string | null
          refunded_at?: string | null
          report_id?: string
          status?: string
          stripe_charge_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_refund_id?: string | null
          succeeded_at?: string | null
          total_amount_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cleanup_contributions_cleanup_attempt_id_fkey"
            columns: ["cleanup_attempt_id"]
            isOneToOne: false
            referencedRelation: "cleanup_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cleanup_contributions_contributor_id_fkey"
            columns: ["contributor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cleanup_contributions_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      cleanup_feature_flags: {
        Row: {
          enabled: boolean
          name: string
          updated_at: string
        }
        Insert: {
          enabled?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          enabled?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      cleanup_financial_audit: {
        Row: {
          action: string
          actor_id: string | null
          actor_kind: string
          cleanup_attempt_id: string | null
          contribution_id: string | null
          created_at: string
          id: number
          metadata: Json
          report_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_kind: string
          cleanup_attempt_id?: string | null
          contribution_id?: string | null
          created_at?: string
          id?: never
          metadata?: Json
          report_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_kind?: string
          cleanup_attempt_id?: string | null
          contribution_id?: string | null
          created_at?: string
          id?: never
          metadata?: Json
          report_id?: string | null
        }
        Relationships: []
      }
      cleanup_notification_deliveries: {
        Row: {
          accepted_at: string | null
          attempt_count: number
          created_at: string
          error_code: string | null
          error_message: string | null
          expo_ticket_id: string | null
          id: string
          last_attempt_at: string | null
          next_attempt_at: string | null
          notification_id: string
          push_device_id: string
          status: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          attempt_count?: number
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          expo_ticket_id?: string | null
          id?: string
          last_attempt_at?: string | null
          next_attempt_at?: string | null
          notification_id: string
          push_device_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          attempt_count?: number
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          expo_ticket_id?: string | null
          id?: string
          last_attempt_at?: string | null
          next_attempt_at?: string | null
          notification_id?: string
          push_device_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cleanup_notification_deliveries_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "cleanup_notifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cleanup_notification_deliveries_push_device_id_fkey"
            columns: ["push_device_id"]
            isOneToOne: false
            referencedRelation: "push_devices"
            referencedColumns: ["id"]
          },
        ]
      }
      cleanup_notifications: {
        Row: {
          cleanup_attempt_id: string | null
          contribution_id: string | null
          created_at: string
          event_type: string
          id: string
          read_at: string | null
          report_id: string
          review_id: string | null
          submission_id: string | null
          user_id: string
        }
        Insert: {
          cleanup_attempt_id?: string | null
          contribution_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          read_at?: string | null
          report_id: string
          review_id?: string | null
          submission_id?: string | null
          user_id: string
        }
        Update: {
          cleanup_attempt_id?: string | null
          contribution_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          read_at?: string | null
          report_id?: string
          review_id?: string | null
          submission_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cleanup_notifications_cleanup_attempt_id_fkey"
            columns: ["cleanup_attempt_id"]
            isOneToOne: false
            referencedRelation: "cleanup_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cleanup_notifications_contribution_id_fkey"
            columns: ["contribution_id"]
            isOneToOne: false
            referencedRelation: "cleanup_contributions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cleanup_notifications_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cleanup_notifications_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "cleanup_reviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cleanup_notifications_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "cleanup_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cleanup_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cleanup_reviews: {
        Row: {
          cleanup_attempt_id: string
          created_at: string
          decision: string
          id: string
          note: string | null
          reason_codes: string[] | null
          reviewer_id: string | null
          submission_id: string
        }
        Insert: {
          cleanup_attempt_id: string
          created_at?: string
          decision: string
          id?: string
          note?: string | null
          reason_codes?: string[] | null
          reviewer_id?: string | null
          submission_id: string
        }
        Update: {
          cleanup_attempt_id?: string
          created_at?: string
          decision?: string
          id?: string
          note?: string | null
          reason_codes?: string[] | null
          reviewer_id?: string | null
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cleanup_reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cleanup_reviews_submission_attempt_fkey"
            columns: ["submission_id", "cleanup_attempt_id"]
            isOneToOne: false
            referencedRelation: "cleanup_submissions"
            referencedColumns: ["id", "cleanup_attempt_id"]
          },
        ]
      }
      cleanup_submission_photos: {
        Row: {
          display_order: number
          id: string
          storage_path: string
          submission_id: string
          uploaded_at: string
        }
        Insert: {
          display_order: number
          id?: string
          storage_path: string
          submission_id: string
          uploaded_at?: string
        }
        Update: {
          display_order?: number
          id?: string
          storage_path?: string
          submission_id?: string
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cleanup_submission_photos_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "cleanup_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      cleanup_submissions: {
        Row: {
          bags_or_items_removed: number | null
          cleanup_attempt_id: string
          created_at: string
          description: string
          duration_minutes: number | null
          id: string
          submission_number: number
          submitted_by: string | null
        }
        Insert: {
          bags_or_items_removed?: number | null
          cleanup_attempt_id: string
          created_at?: string
          description: string
          duration_minutes?: number | null
          id?: string
          submission_number: number
          submitted_by?: string | null
        }
        Update: {
          bags_or_items_removed?: number | null
          cleanup_attempt_id?: string
          created_at?: string
          description?: string
          duration_minutes?: number | null
          id?: string
          submission_number?: number
          submitted_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cleanup_submissions_cleanup_attempt_id_fkey"
            columns: ["cleanup_attempt_id"]
            isOneToOne: false
            referencedRelation: "cleanup_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cleanup_submissions_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cleanup_waiver_acceptances: {
        Row: {
          accepted_at: string
          guidelines_version: string
          user_id: string
          waiver_version: string
        }
        Insert: {
          accepted_at?: string
          guidelines_version: string
          user_id: string
          waiver_version: string
        }
        Update: {
          accepted_at?: string
          guidelines_version?: string
          user_id?: string
          waiver_version?: string
        }
        Relationships: [
          {
            foreignKeyName: "cleanup_waiver_acceptances_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cleanup_waiver_acceptances_version_fkey"
            columns: ["waiver_version", "guidelines_version"]
            isOneToOne: false
            referencedRelation: "cleanup_waiver_versions"
            referencedColumns: ["waiver_version", "guidelines_version"]
          },
        ]
      }
      cleanup_waiver_versions: {
        Row: {
          body: string
          guidelines_body: string | null
          guidelines_version: string
          is_active: boolean
          published_at: string
          release_body: string | null
          retired_at: string | null
          title: string
          waiver_version: string
        }
        Insert: {
          body: string
          guidelines_body?: string | null
          guidelines_version: string
          is_active?: boolean
          published_at?: string
          release_body?: string | null
          retired_at?: string | null
          title: string
          waiver_version: string
        }
        Update: {
          body?: string
          guidelines_body?: string | null
          guidelines_version?: string
          is_active?: boolean
          published_at?: string
          release_body?: string | null
          retired_at?: string | null
          title?: string
          waiver_version?: string
        }
        Relationships: []
      }
      processed_stripe_events: {
        Row: {
          event_id: string
          event_type: string
          livemode: boolean
          payload: Json
          processed_at: string
        }
        Insert: {
          event_id: string
          event_type: string
          livemode: boolean
          payload: Json
          processed_at?: string
        }
        Update: {
          event_id?: string
          event_type?: string
          livemode?: boolean
          payload?: Json
          processed_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_path: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          id: string
          location: string | null
          profile_completed_at: string | null
          provider_avatar_url: string | null
          rank_celebrated_through_points: number
          reports_created_count: number
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_path?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          location?: string | null
          profile_completed_at?: string | null
          provider_avatar_url?: string | null
          rank_celebrated_through_points?: number
          reports_created_count?: number
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_path?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          location?: string | null
          profile_completed_at?: string | null
          provider_avatar_url?: string | null
          rank_celebrated_through_points?: number
          reports_created_count?: number
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      push_devices: {
        Row: {
          created_at: string
          disabled_at: string | null
          expo_push_token: string
          id: string
          installation_id: string
          last_registered_at: string
          platform: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          disabled_at?: string | null
          expo_push_token: string
          id?: string
          installation_id: string
          last_registered_at?: string
          platform: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          disabled_at?: string | null
          expo_push_token?: string
          id?: string
          installation_id?: string
          last_registered_at?: string
          platform?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_devices_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rank_point_events: {
        Row: {
          created_at: string
          id: string
          points: number
          source_id: string
          source_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          points: number
          source_id: string
          source_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          points?: number
          source_id?: string
          source_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rank_point_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          cancelled_at: string | null
          cleanup_state: string
          created_at: string | null
          expired_at: string | null
          expires_at: string | null
          funded_amount_cents: number
          funding_eligibility: string
          funding_frozen_at: string | null
          funding_hold_reason: string | null
          funding_locked_at: string | null
          id: string
          latitude: number | null
          litter_types: string[] | null
          longitude: number | null
          notes_other: string | null
          notes_presets: string[] | null
          original_photo_reviewed_at: string | null
          photo_paths: string[] | null
          renewal_decision_due_at: string | null
          renewal_status: string
          severity: string | null
          status: string | null
          title: string | null
          types: string | null
          user_id: string | null
        }
        Insert: {
          cancelled_at?: string | null
          cleanup_state?: string
          created_at?: string | null
          expired_at?: string | null
          expires_at?: string | null
          funded_amount_cents?: number
          funding_eligibility?: string
          funding_frozen_at?: string | null
          funding_hold_reason?: string | null
          funding_locked_at?: string | null
          id?: string
          latitude?: number | null
          litter_types?: string[] | null
          longitude?: number | null
          notes_other?: string | null
          notes_presets?: string[] | null
          original_photo_reviewed_at?: string | null
          photo_paths?: string[] | null
          renewal_decision_due_at?: string | null
          renewal_status?: string
          severity?: string | null
          status?: string | null
          title?: string | null
          types?: string | null
          user_id?: string | null
        }
        Update: {
          cancelled_at?: string | null
          cleanup_state?: string
          created_at?: string | null
          expired_at?: string | null
          expires_at?: string | null
          funded_amount_cents?: number
          funding_eligibility?: string
          funding_frozen_at?: string | null
          funding_hold_reason?: string | null
          funding_locked_at?: string | null
          id?: string
          latitude?: number | null
          litter_types?: string[] | null
          longitude?: number | null
          notes_other?: string | null
          notes_presets?: string[] | null
          original_photo_reviewed_at?: string | null
          photo_paths?: string[] | null
          renewal_decision_due_at?: string | null
          renewal_status?: string
          severity?: string | null
          status?: string | null
          title?: string | null
          types?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_moderation_reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          reason: string
          reported_user_id: string
          reporter_id: string
          resolution: string | null
          reviewed_at: string | null
          source_report_id: string | null
          status: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          reason: string
          reported_user_id: string
          reporter_id: string
          resolution?: string | null
          reviewed_at?: string | null
          source_report_id?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          reason?: string
          reported_user_id?: string
          reporter_id?: string
          resolution?: string | null
          reviewed_at?: string | null
          source_report_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_moderation_reports_reported_user_id_fkey"
            columns: ["reported_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_moderation_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_moderation_reports_source_report_id_fkey"
            columns: ["source_report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      acknowledge_current_rank: { Args: never; Returns: number }
      accept_cleanup_waiver: {
        Args: {
          accepted_guidelines_version: string
          accepted_waiver_version: string
        }
        Returns: {
          accepted_at: string
          guidelines_version: string
          user_id: string
          waiver_version: string
        }
        SetofOptions: {
          from: "*"
          to: "cleanup_waiver_acceptances"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      acknowledge_cleanup_notifications: {
        Args: { target_notification_ids: string[] }
        Returns: {
          cleanup_attempt_id: string | null
          contribution_id: string | null
          created_at: string
          event_type: string
          id: string
          read_at: string | null
          report_id: string
          review_id: string | null
          submission_id: string | null
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "cleanup_notifications"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      claim_cleanup: {
        Args: { target_report_id: string }
        Returns: {
          approval_method: string | null
          cancelled_at: string | null
          claim_expires_at: string
          claimed_at: string
          cleaner_id: string | null
          completed_at: string | null
          correction_due_at: string | null
          dispute_reason: string | null
          dispute_status: string
          disputed_at: string | null
          expired_at: string | null
          final_reviewer_id: string | null
          final_submission_id: string | null
          financial_review_attempts: number
          financial_review_status: string
          financial_review_summary: string | null
          first_paid_admin_status: string
          first_paid_cleanup: boolean
          first_submitted_at: string | null
          guidelines_version: string
          id: string
          is_paid: boolean
          is_self_cleanup: boolean
          last_activity_at: string
          latest_submitted_at: string | null
          payout_attempts: number
          payout_last_error: string | null
          payout_status: string
          released_at: string | null
          report_id: string
          reporter_id: string | null
          review_due_at: string | null
          reward_amount_cents: number
          status: string
          stripe_transfer_id: string | null
          waiver_version: string
        }
        SetofOptions: {
          from: "*"
          to: "cleanup_attempts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      claim_cleanup_payout_operation: {
        Args: never
        Returns: {
          approval_method: string | null
          cancelled_at: string | null
          claim_expires_at: string
          claimed_at: string
          cleaner_id: string | null
          completed_at: string | null
          correction_due_at: string | null
          dispute_reason: string | null
          dispute_status: string
          disputed_at: string | null
          expired_at: string | null
          final_reviewer_id: string | null
          final_submission_id: string | null
          financial_review_attempts: number
          financial_review_status: string
          financial_review_summary: string | null
          first_paid_admin_status: string
          first_paid_cleanup: boolean
          first_submitted_at: string | null
          guidelines_version: string
          id: string
          is_paid: boolean
          is_self_cleanup: boolean
          last_activity_at: string
          latest_submitted_at: string | null
          payout_attempts: number
          payout_last_error: string | null
          payout_status: string
          released_at: string | null
          report_id: string
          reporter_id: string | null
          review_due_at: string | null
          reward_amount_cents: number
          status: string
          stripe_transfer_id: string | null
          waiver_version: string
        }
        SetofOptions: {
          from: "*"
          to: "cleanup_attempts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      claim_cleanup_push_deliveries: {
        Args: { batch_limit?: number; target_notification_id?: string }
        Returns: {
          cleanup_attempt_id: string
          delivery_id: string
          event_type: string
          expo_push_token: string
          notification_id: string
          push_device_id: string
          report_id: string
          review_id: string
          submission_id: string
        }[]
      }
      claim_cleanup_refund_operation: {
        Args: never
        Returns: {
          auto_refund_due_at: string | null
          cleanup_attempt_id: string | null
          client_request_id: string
          contributor_id: string | null
          created_at: string
          currency: string
          failure_code: string | null
          id: string
          platform_fee_cents: number
          principal_amount_cents: number
          refund_attempts: number
          refund_processing_started_at: string | null
          refund_requested_at: string | null
          refunded_at: string | null
          report_id: string
          status: string
          stripe_charge_id: string | null
          stripe_payment_intent_id: string | null
          stripe_refund_id: string | null
          succeeded_at: string | null
          total_amount_cents: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "cleanup_contributions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      close_expired_report: {
        Args: { target_report_id: string }
        Returns: {
          cancelled_at: string | null
          cleanup_state: string
          created_at: string | null
          expired_at: string | null
          expires_at: string | null
          funded_amount_cents: number
          funding_eligibility: string
          funding_frozen_at: string | null
          funding_hold_reason: string | null
          funding_locked_at: string | null
          id: string
          latitude: number | null
          litter_types: string[] | null
          longitude: number | null
          notes_other: string | null
          notes_presets: string[] | null
          original_photo_reviewed_at: string | null
          photo_paths: string[] | null
          renewal_decision_due_at: string | null
          renewal_status: string
          severity: string | null
          status: string | null
          title: string | null
          types: string | null
          user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "reports"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      complete_cleanup_push_delivery: {
        Args: {
          delivery_outcome: string
          target_delivery_id: string
          target_error_code?: string
          target_error_message?: string
          target_ticket_id?: string
        }
        Returns: undefined
      }
      create_cleanup_contribution_intent: {
        Args: {
          payment_intent_id: string
          principal_cents: number
          target_client_request_id: string
          target_contributor_id: string
          target_report_id: string
        }
        Returns: {
          auto_refund_due_at: string | null
          cleanup_attempt_id: string | null
          client_request_id: string
          contributor_id: string | null
          created_at: string
          currency: string
          failure_code: string | null
          id: string
          platform_fee_cents: number
          principal_amount_cents: number
          refund_attempts: number
          refund_processing_started_at: string | null
          refund_requested_at: string | null
          refunded_at: string | null
          report_id: string
          status: string
          stripe_charge_id: string | null
          stripe_payment_intent_id: string | null
          stripe_refund_id: string | null
          succeeded_at: string | null
          total_amount_cents: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "cleanup_contributions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      delete_expired_reports: { Args: never; Returns: undefined }
      dispute_paid_cleanup: {
        Args: { dispute_reason: string; target_cleanup_id: string }
        Returns: {
          approval_method: string | null
          cancelled_at: string | null
          claim_expires_at: string
          claimed_at: string
          cleaner_id: string | null
          completed_at: string | null
          correction_due_at: string | null
          dispute_reason: string | null
          dispute_status: string
          disputed_at: string | null
          expired_at: string | null
          final_reviewer_id: string | null
          final_submission_id: string | null
          financial_review_attempts: number
          financial_review_status: string
          financial_review_summary: string | null
          first_paid_admin_status: string
          first_paid_cleanup: boolean
          first_submitted_at: string | null
          guidelines_version: string
          id: string
          is_paid: boolean
          is_self_cleanup: boolean
          last_activity_at: string
          latest_submitted_at: string | null
          payout_attempts: number
          payout_last_error: string | null
          payout_status: string
          released_at: string | null
          report_id: string
          reporter_id: string | null
          review_due_at: string | null
          reward_amount_cents: number
          status: string
          stripe_transfer_id: string | null
          waiver_version: string
        }
        SetofOptions: {
          from: "*"
          to: "cleanup_attempts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      finalize_cleanup_contribution: {
        Args: {
          charge_id: string
          payment_failure_code?: string
          payment_intent_id: string
          payment_succeeded: boolean
        }
        Returns: {
          auto_refund_due_at: string | null
          cleanup_attempt_id: string | null
          client_request_id: string
          contributor_id: string | null
          created_at: string
          currency: string
          failure_code: string | null
          id: string
          platform_fee_cents: number
          principal_amount_cents: number
          refund_attempts: number
          refund_processing_started_at: string | null
          refund_requested_at: string | null
          refunded_at: string | null
          report_id: string
          status: string
          stripe_charge_id: string | null
          stripe_payment_intent_id: string | null
          stripe_refund_id: string | null
          succeeded_at: string | null
          total_amount_cents: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "cleanup_contributions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_cleanup_admin_case: {
        Args: { target_case_id: string }
        Returns: Json
      }
      get_rank_points: { Args: { target_user_id: string }; Returns: number }
      is_cleanup_admin: { Args: never; Returns: boolean }
      is_cleanup_admin_member: { Args: never; Returns: boolean }
      is_permanent_user: { Args: never; Returns: boolean }
      list_cleanup_admin_cases: {
        Args: { target_status?: string }
        Returns: Json
      }
      mark_cleanup_payout_result: {
        Args: {
          target_cleanup_id: string
          target_error?: string
          target_transfer_id?: string
          transfer_succeeded: boolean
        }
        Returns: {
          approval_method: string | null
          cancelled_at: string | null
          claim_expires_at: string
          claimed_at: string
          cleaner_id: string | null
          completed_at: string | null
          correction_due_at: string | null
          dispute_reason: string | null
          dispute_status: string
          disputed_at: string | null
          expired_at: string | null
          final_reviewer_id: string | null
          final_submission_id: string | null
          financial_review_attempts: number
          financial_review_status: string
          financial_review_summary: string | null
          first_paid_admin_status: string
          first_paid_cleanup: boolean
          first_submitted_at: string | null
          guidelines_version: string
          id: string
          is_paid: boolean
          is_self_cleanup: boolean
          last_activity_at: string
          latest_submitted_at: string | null
          payout_attempts: number
          payout_last_error: string | null
          payout_status: string
          released_at: string | null
          report_id: string
          reporter_id: string | null
          review_due_at: string | null
          reward_amount_cents: number
          status: string
          stripe_transfer_id: string | null
          waiver_version: string
        }
        SetofOptions: {
          from: "*"
          to: "cleanup_attempts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      mark_cleanup_refund_processing: {
        Args: { target_contribution_id: string; target_refund_id: string }
        Returns: {
          auto_refund_due_at: string | null
          cleanup_attempt_id: string | null
          client_request_id: string
          contributor_id: string | null
          created_at: string
          currency: string
          failure_code: string | null
          id: string
          platform_fee_cents: number
          principal_amount_cents: number
          refund_attempts: number
          refund_processing_started_at: string | null
          refund_requested_at: string | null
          refunded_at: string | null
          report_id: string
          status: string
          stripe_charge_id: string | null
          stripe_payment_intent_id: string | null
          stripe_refund_id: string | null
          succeeded_at: string | null
          total_amount_cents: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "cleanup_contributions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      mark_cleanup_refund_result: {
        Args: {
          refund_succeeded: boolean
          target_contribution_id: string
          target_error?: string
          target_refund_id?: string
        }
        Returns: {
          auto_refund_due_at: string | null
          cleanup_attempt_id: string | null
          client_request_id: string
          contributor_id: string | null
          created_at: string
          currency: string
          failure_code: string | null
          id: string
          platform_fee_cents: number
          principal_amount_cents: number
          refund_attempts: number
          refund_processing_started_at: string | null
          refund_requested_at: string | null
          refunded_at: string | null
          report_id: string
          status: string
          stripe_charge_id: string | null
          stripe_payment_intent_id: string | null
          stripe_refund_id: string | null
          succeeded_at: string | null
          total_amount_cents: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "cleanup_contributions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      mark_cleanup_transfer_reversed: {
        Args: {
          target_cleanup_id: string
          target_error: string
          target_transfer_id: string
        }
        Returns: {
          approval_method: string | null
          cancelled_at: string | null
          claim_expires_at: string
          claimed_at: string
          cleaner_id: string | null
          completed_at: string | null
          correction_due_at: string | null
          dispute_reason: string | null
          dispute_status: string
          disputed_at: string | null
          expired_at: string | null
          final_reviewer_id: string | null
          final_submission_id: string | null
          financial_review_attempts: number
          financial_review_status: string
          financial_review_summary: string | null
          first_paid_admin_status: string
          first_paid_cleanup: boolean
          first_submitted_at: string | null
          guidelines_version: string
          id: string
          is_paid: boolean
          is_self_cleanup: boolean
          last_activity_at: string
          latest_submitted_at: string | null
          payout_attempts: number
          payout_last_error: string | null
          payout_status: string
          released_at: string | null
          report_id: string
          reporter_id: string | null
          review_due_at: string | null
          reward_amount_cents: number
          status: string
          stripe_transfer_id: string | null
          waiver_version: string
        }
        SetofOptions: {
          from: "*"
          to: "cleanup_attempts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      prepare_funded_cleanup_account_deletion: {
        Args: { target_user_id: string }
        Returns: undefined
      }
      record_cleanup_ai_result: {
        Args: {
          result_image_hashes: string[]
          result_model: string
          result_raw: Json
          result_reason_codes: string[]
          result_status: string
          result_summary: string
          target_check_id: string
        }
        Returns: {
          attempt_number: number
          check_kind: string
          cleanup_attempt_id: string | null
          completed_at: string | null
          created_at: string
          id: string
          image_hashes: string[]
          last_provider_error: string | null
          model: string | null
          prompt_version: string
          provider_attempts: number
          provider_started_at: string | null
          raw_result: Json | null
          reason_codes: string[]
          report_id: string
          status: string
          submission_id: string | null
          user_summary: string | null
        }
        SetofOptions: {
          from: "*"
          to: "cleanup_ai_checks"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      record_stripe_chargeback_event: {
        Args: {
          target_amount_cents: number
          target_charge_id: string
          target_dispute_id: string
          target_event_id: string
        }
        Returns: undefined
      }
      register_push_device: {
        Args: {
          target_expo_push_token: string
          target_installation_id: string
          target_platform: string
        }
        Returns: {
          created_at: string
          disabled_at: string | null
          expo_push_token: string
          id: string
          installation_id: string
          last_registered_at: string
          platform: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "push_devices"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      release_cleanup: {
        Args: { target_cleanup_id: string }
        Returns: {
          approval_method: string | null
          cancelled_at: string | null
          claim_expires_at: string
          claimed_at: string
          cleaner_id: string | null
          completed_at: string | null
          correction_due_at: string | null
          dispute_reason: string | null
          dispute_status: string
          disputed_at: string | null
          expired_at: string | null
          final_reviewer_id: string | null
          final_submission_id: string | null
          financial_review_attempts: number
          financial_review_status: string
          financial_review_summary: string | null
          first_paid_admin_status: string
          first_paid_cleanup: boolean
          first_submitted_at: string | null
          guidelines_version: string
          id: string
          is_paid: boolean
          is_self_cleanup: boolean
          last_activity_at: string
          latest_submitted_at: string | null
          payout_attempts: number
          payout_last_error: string | null
          payout_status: string
          released_at: string | null
          report_id: string
          reporter_id: string | null
          review_due_at: string | null
          reward_amount_cents: number
          status: string
          stripe_transfer_id: string | null
          waiver_version: string
        }
        SetofOptions: {
          from: "*"
          to: "cleanup_attempts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      renew_report: {
        Args: { target_report_id: string }
        Returns: {
          cancelled_at: string | null
          cleanup_state: string
          created_at: string | null
          expired_at: string | null
          expires_at: string | null
          funded_amount_cents: number
          funding_eligibility: string
          funding_frozen_at: string | null
          funding_hold_reason: string | null
          funding_locked_at: string | null
          id: string
          latitude: number | null
          litter_types: string[] | null
          longitude: number | null
          notes_other: string | null
          notes_presets: string[] | null
          original_photo_reviewed_at: string | null
          photo_paths: string[] | null
          renewal_decision_due_at: string | null
          renewal_status: string
          severity: string | null
          status: string | null
          title: string | null
          types: string | null
          user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "reports"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      resolve_cleanup_admin_case: {
        Args: {
          target_action: string
          target_case_id: string
          target_reason: string
        }
        Returns: Json
      }
      review_cleanup: {
        Args: {
          request_change_reasons?: string[]
          review_decision: string
          reviewer_note?: string
          target_cleanup_id: string
          target_submission_id: string
        }
        Returns: {
          approval_method: string | null
          cancelled_at: string | null
          claim_expires_at: string
          claimed_at: string
          cleaner_id: string | null
          completed_at: string | null
          correction_due_at: string | null
          dispute_reason: string | null
          dispute_status: string
          disputed_at: string | null
          expired_at: string | null
          final_reviewer_id: string | null
          final_submission_id: string | null
          financial_review_attempts: number
          financial_review_status: string
          financial_review_summary: string | null
          first_paid_admin_status: string
          first_paid_cleanup: boolean
          first_submitted_at: string | null
          guidelines_version: string
          id: string
          is_paid: boolean
          is_self_cleanup: boolean
          last_activity_at: string
          latest_submitted_at: string | null
          payout_attempts: number
          payout_last_error: string | null
          payout_status: string
          released_at: string | null
          report_id: string
          reporter_id: string | null
          review_due_at: string | null
          reward_amount_cents: number
          status: string
          stripe_transfer_id: string | null
          waiver_version: string
        }
        SetofOptions: {
          from: "*"
          to: "cleanup_attempts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      submit_cleanup: {
        Args: {
          cleanup_bags_or_items_removed?: number
          cleanup_description: string
          cleanup_duration_minutes?: number
          cleanup_photo_paths: string[]
          target_cleanup_id: string
          target_submission_id: string
        }
        Returns: {
          bags_or_items_removed: number | null
          cleanup_attempt_id: string
          created_at: string
          description: string
          duration_minutes: number | null
          id: string
          submission_number: number
          submitted_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "cleanup_submissions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      sync_cleaner_payout_account: {
        Args: {
          target_country: string
          target_onboarding_status: string
          target_payouts_enabled: boolean
          target_requirements_due?: string[]
          target_stripe_account_id: string
          target_user_id: string
        }
        Returns: {
          age_18_confirmed_at: string | null
          country: string | null
          created_at: string
          onboarding_status: string
          payouts_enabled: boolean
          requirements_due: string[]
          stripe_account_id: string | null
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "cleaner_payout_accounts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      unregister_push_device: {
        Args: { target_installation_id: string }
        Returns: boolean
      }
      verify_cleanup_push_webhook: {
        Args: { candidate_secret: string }
        Returns: boolean
      }
      verify_report_photo_cleanup_webhook: {
        Args: { candidate_secret: string }
        Returns: boolean
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

export type Report = Tables<'reports'>
export type ReportInsert = TablesInsert<'reports'>
export type ReportUpdate = TablesUpdate<'reports'>
export type Profile = Tables<'profiles'>
export type ProfileUpdate = TablesUpdate<'profiles'>
export type UserBlock = Tables<'user_blocks'>
export type UserModerationReport = Tables<'user_moderation_reports'>
export type CleanupAttempt = Tables<'cleanup_attempts'>
export type CleanupSubmission = Tables<'cleanup_submissions'>
export type CleanupSubmissionPhoto = Tables<'cleanup_submission_photos'>
export type CleanupReview = Tables<'cleanup_reviews'>
export type CleanupWaiverVersion = Tables<'cleanup_waiver_versions'>
export type CleanupWaiverAcceptance = Tables<'cleanup_waiver_acceptances'>
export type RankPointEvent = Tables<'rank_point_events'>
