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
          status: "pending" | "active" | "expired";
          start_date: string | null;
          end_date: string | null;
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
          status: "pending" | "paid" | "failed";
          amount_cents: number | null;
          paid_at: string | null;
          raw_webhook: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["payments"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["payments"]["Row"]>;
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
        };
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
  };
};

