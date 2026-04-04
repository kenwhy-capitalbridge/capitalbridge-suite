export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

/**
 * Minimal DB types used by platform+api.
 * Extend as needed when new tables are accessed.
 */
export type Database = {
  public: {
    Tables: {
      plans: {
        Row: { id: string; slug: string; name: string; price_cents: number; duration_days: number | null; is_trial: boolean };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      memberships: {
        Row: {
          id: string;
          user_id: string;
          plan_id: string;
          status: "pending" | "bill_created" | "paid" | "active" | "failed" | "expired" | "cancelled";
          start_date: string | null;
          end_date: string | null;
          started_at: string | null;
          expires_at: string | null;
          cancelled_at: string | null;
          renewed_at: string | null;
          billing_session_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["memberships"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["memberships"]["Row"]>;
        Relationships: [];
      };
      payments: {
        Row: {
          id: string;
          membership_id: string | null;
          user_id: string | null;
          plan_id: string | null;
          billplz_bill_id: string | null;
          billplz_collection_id: string | null;
          billing_session_id: string | null;
          status: "pending" | "paid" | "failed";
          amount_cents: number | null;
          paid_at: string | null;
          raw_webhook: Json | null;
          payment_provider: string | null;
          payment_currency: string | null;
          payment_amount: number | null;
          payment_confirmed_at: string | null;
          recovery_email_sent: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["payments"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["payments"]["Row"]>;
        Relationships: [];
      };
      billing_sessions: {
        Row: {
          id: string;
          user_id: string | null;
          plan_id: string;
          /** Denormalized `plans.slug` (e.g. trial); required alongside plan_id on insert. */
          plan: string;
          status: "pending" | "bill_created" | "paid";
          bill_id: string | null;
          payment_url: string | null;
          membership_id: string | null;
          payment_attempt_count: number;
          last_payment_error: string | null;
          email: string | null;
          payment_provider: string | null;
          payment_currency: string | null;
          payment_amount: number | null;
          payment_confirmed_at: string | null;
          created_at: string;
          updated_at: string;
          checkout_ip_hash: string | null;
          checkout_device_id: string | null;
          checkout_metadata: Record<string, unknown> | null;
        };
        Insert: Partial<Database["public"]["Tables"]["billing_sessions"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["billing_sessions"]["Row"]>;
        Relationships: [];
      };
      trial_consumption_fingerprints: {
        Row: {
          id: string;
          user_id: string;
          ip_hash: string | null;
          device_id: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["trial_consumption_fingerprints"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["trial_consumption_fingerprints"]["Row"]>;
        Relationships: [];
      };
      user_active_session: {
        Row: {
          user_id: string;
          session_id: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["user_active_session"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["user_active_session"]["Row"]>;
        Relationships: [];
      };
      active_memberships: {
        Row: {
          user_id: string;
          plan: string;
          start_date: string | null;
          end_date: string | null;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          trial_count: number | null;
          trial_use_count: number | null;
          payment_status: string | null;
          pending_plan: string | null;
          email: string | null;
          first_name: string | null;
          last_name: string | null;
          plan_change_intent: string | null;
          /** Advisory pricing region (MY|SG|…); from checkout or profile change after top-up */
          advisory_market: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
        Relationships: [];
      };
      pending_bills: {
        Row: {
          id: string;
          email: string;
          plan_id: string;
          name: string | null;
          billplz_bill_id: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["pending_bills"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["pending_bills"]["Row"]>;
        Relationships: [];
      };
      billing_events: {
        Row: {
          id: string;
          event_type: string;
          user_id: string | null;
          membership_id: string | null;
          payment_id: string | null;
          created_at: string;
          metadata: Json | null;
        };
        Insert: Partial<Database["public"]["Tables"]["billing_events"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["billing_events"]["Row"]>;
        Relationships: [];
      };
      strategic_interest: {
        Row: {
          id: string;
          user_id: string;
          report_id: string | null;
          country: string;
          interest_type: string | null;
          contact_phone: string | null;
          subscriber_message: string | null;
          status: string;
          notes: string | null;
          last_contacted_at: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["strategic_interest"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["strategic_interest"]["Row"]>;
        Relationships: [];
      };
      payment_events: {
        Row: {
          id: string;
          billing_session_id: string | null;
          event_type: string;
          event_payload: Json | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["payment_events"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["payment_events"]["Row"]>;
        Relationships: [];
      };
      admin_billing_email_recoveries: {
        Row: {
          id: string;
          bill_id: string;
          old_email: string | null;
          new_email: string;
          old_user_id: string | null;
          new_user_id: string | null;
          membership_id: string | null;
          status: "completed" | "denied";
          error_code: string | null;
          performed_by_actor: string | null;
          client_ip: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["admin_billing_email_recoveries"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["admin_billing_email_recoveries"]["Row"]>;
        Relationships: [];
      };
      model_runs: {
        Row: {
          id: string;
          user_id: string;
          model_key: "forever-income-model" | "income-engineering-model" | "capital-health-model" | "capital-stress-model";
          source_app: string;
          status: "draft" | "completed" | "failed";
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["model_runs"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["model_runs"]["Row"]>;
        Relationships: [];
      };
      model_inputs: {
        Row: {
          id: string;
          run_id: string;
          user_id: string;
          payload: Json;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["model_inputs"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["model_inputs"]["Row"]>;
        Relationships: [];
      };
      model_outputs: {
        Row: {
          id: string;
          run_id: string;
          user_id: string;
          payload: Json;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["model_outputs"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["model_outputs"]["Row"]>;
        Relationships: [];
      };
      model_shared_facts: {
        Row: {
          id: string;
          user_id: string;
          fact_key: string;
          fact_value: Json;
          source_model_key:
            | "forever-income-model"
            | "income-engineering-model"
            | "capital-health-model"
            | "capital-stress-model";
          run_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["model_shared_facts"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["model_shared_facts"]["Row"]>;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
  };
  advisory_v2: {
    Tables: {
      advisory_sessions: {
        Row: { id: string; user_id: string; created_at: string };
        Insert: Partial<{ id: string; user_id: string; created_at: string }>;
        Update: Partial<{ id: string; user_id: string; created_at: string }>;
        Relationships: [];
      };
      advisory_reports: {
        Row: {
          id: string;
          session_id: string;
          user_id: string;
          model_type: "forever-income" | "income-engineering" | "capital-health" | "capital-stress";
          inputs: Json;
          results: Json;
          created_at: string;
        };
        Insert: Partial<{
          id: string;
          session_id: string;
          user_id: string;
          model_type: "forever-income" | "income-engineering" | "capital-health" | "capital-stress";
          inputs: Json;
          results: Json;
          created_at: string;
        }>;
        Update: Partial<{
          id: string;
          session_id: string;
          user_id: string;
          model_type: "forever-income" | "income-engineering" | "capital-health" | "capital-stress";
          inputs: Json;
          results: Json;
          created_at: string;
        }>;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
  };
};
