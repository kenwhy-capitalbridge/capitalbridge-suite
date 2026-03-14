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
          membership_id: string;
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
        };
        Insert: Partial<Database["public"]["Tables"]["billing_sessions"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["billing_sessions"]["Row"]>;
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
          trial_use_count: number | null;
          payment_status: string | null;
          pending_plan: string | null;
          email: string | null;
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
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
  };
};

