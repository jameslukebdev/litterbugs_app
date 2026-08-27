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
          financial_review_attempts: number
          financial_review_status: string
          financial_review_summary: string | null
          final_reviewer_id: string | null
          final_submission_id: string | null
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
          reward_amount_cents: number
          review_due_at: string | null
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
          financial_review_attempts?: number
          financial_review_status?: string
          financial_review_summary?: string | null
          final_reviewer_id?: string | null
          final_submission_id?: string | null
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
          reward_amount_cents?: number
          review_due_at?: string | null
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
          financial_review_attempts?: number
          financial_review_status?: string
          financial_review_summary?: string | null
          final_reviewer_id?: string | null
          final_submission_id?: string | null
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
          reward_amount_cents?: number
          review_due_at?: string | null
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
          guidelines_version: string
          is_active: boolean
          published_at: string
          retired_at: string | null
          title: string
          waiver_version: string
        }
        Insert: {
          body: string
          guidelines_version: string
          is_active?: boolean
          published_at?: string
          retired_at?: string | null
          title: string
          waiver_version: string
        }
        Update: {
          body?: string
          guidelines_version?: string
          is_active?: boolean
          published_at?: string
          retired_at?: string | null
          title?: string
          waiver_version?: string
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
          reports_created_count?: number
          updated_at?: string
          username?: string | null
        }
        Relationships: []
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
          photo_paths: string[] | null
          original_photo_reviewed_at: string | null
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
          photo_paths?: string[] | null
          original_photo_reviewed_at?: string | null
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
          photo_paths?: string[] | null
          original_photo_reviewed_at?: string | null
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
      claim_cleanup: {
        Args: { target_report_id: string }
        Returns: {
          approval_method: string | null
          cancelled_at: string | null
          claim_expires_at: string
          claimed_at: string
          cleaner_id: string | null
          completed_at: string | null
          expired_at: string | null
          final_reviewer_id: string | null
          final_submission_id: string | null
          first_submitted_at: string | null
          guidelines_version: string
          id: string
          is_self_cleanup: boolean
          last_activity_at: string
          latest_submitted_at: string | null
          released_at: string | null
          report_id: string
          reporter_id: string | null
          review_due_at: string | null
          status: string
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
        Returns: Database["public"]["Tables"]["cleanup_attempts"]["Row"]
      }
      claim_cleanup_refund_operation: {
        Args: never
        Returns: Database["public"]["Tables"]["cleanup_contributions"]["Row"]
      }
      delete_expired_reports: { Args: never; Returns: undefined }
      get_cleanup_admin_case: { Args: { target_case_id: string }; Returns: Json }
      is_cleanup_admin: { Args: never; Returns: boolean }
      is_cleanup_admin_member: { Args: never; Returns: boolean }
      is_permanent_user: { Args: never; Returns: boolean }
      list_cleanup_admin_cases: { Args: { target_status?: string }; Returns: Json }
      mark_cleanup_payout_result: {
        Args: {
          target_cleanup_id: string
          target_error?: string | null
          target_transfer_id?: string | null
          transfer_succeeded: boolean
        }
        Returns: Database["public"]["Tables"]["cleanup_attempts"]["Row"]
      }
      mark_cleanup_refund_processing: {
        Args: {
          target_contribution_id: string
          target_refund_id: string
        }
        Returns: Database["public"]["Tables"]["cleanup_contributions"]["Row"]
      }
      mark_cleanup_refund_result: {
        Args: {
          refund_succeeded: boolean
          target_contribution_id: string
          target_error?: string | null
          target_refund_id?: string | null
        }
        Returns: Database["public"]["Tables"]["cleanup_contributions"]["Row"]
      }
      mark_cleanup_transfer_reversed: {
        Args: {
          target_cleanup_id: string
          target_error: string
          target_transfer_id: string
        }
        Returns: Database["public"]["Tables"]["cleanup_attempts"]["Row"]
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
          expired_at: string | null
          final_reviewer_id: string | null
          final_submission_id: string | null
          first_submitted_at: string | null
          guidelines_version: string
          id: string
          is_self_cleanup: boolean
          last_activity_at: string
          latest_submitted_at: string | null
          released_at: string | null
          report_id: string
          reporter_id: string | null
          review_due_at: string | null
          status: string
          waiver_version: string
        }
        SetofOptions: {
          from: "*"
          to: "cleanup_attempts"
          isOneToOne: true
          isSetofReturn: false
        }
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
          expired_at: string | null
          final_reviewer_id: string | null
          final_submission_id: string | null
          first_submitted_at: string | null
          guidelines_version: string
          id: string
          is_self_cleanup: boolean
          last_activity_at: string
          latest_submitted_at: string | null
          released_at: string | null
          report_id: string
          reporter_id: string | null
          review_due_at: string | null
          status: string
          waiver_version: string
        }
        SetofOptions: {
          from: "*"
          to: "cleanup_attempts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      resolve_cleanup_admin_case: {
        Args: { target_action: string; target_case_id: string; target_reason: string }
        Returns: Json
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
