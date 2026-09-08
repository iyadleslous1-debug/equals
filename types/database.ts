/**
 * Supabase schema types.
 *
 * ⚠️  DO NOT hand-edit — regenerate after every migration:
 *
 *     npm run gen:types
 *     # → supabase gen types typescript --linked > types/database.ts
 *
 * Requires the Supabase CLI + a linked project (`supabase link`). This
 * checked-in copy matches `supabase/migrations/0001_mvp0_core.sql` so the app
 * typechecks offline; CI regenerates and diffs to catch drift.
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          phone_number: string | null;
          created_at: string;
          account_status: 'active' | 'suspended' | 'deleted';
        };
        Insert: {
          id: string;
          phone_number?: string | null;
          account_status?: 'active' | 'suspended' | 'deleted';
        };
        Update: { phone_number?: string | null; account_status?: 'active' | 'suspended' | 'deleted' };
      };
      profiles: {
        Row: {
          id: string;
          user_id: string;
          display_name: string;
          age: number;
          gender: 'male' | 'female';
          wilaya: number;
          bio: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          display_name: string;
          age: number;
          gender: 'male' | 'female';
          wilaya: number;
          bio?: string | null;
        };
        Update: {
          display_name?: string;
          age?: number;
          gender?: 'male' | 'female';
          wilaya?: number;
          bio?: string | null;
        };
      };
      profile_photos: {
        Row: { id: string; profile_id: string; url: string; order_index: number; is_card_photo: boolean };
        Insert: { profile_id: string; url: string; order_index?: number; is_card_photo?: boolean };
        Update: { url?: string; order_index?: number; is_card_photo?: boolean };
      };
      swipe_actions: {
        Row: {
          id: string;
          swiper_id: string;
          swiped_id: string;
          action: 'skip' | 'request';
          created_at: string;
        };
        Insert: { swiper_id: string; swiped_id: string; action: 'skip' | 'request' };
        Update: never;
      };
      friend_requests: {
        Row: {
          id: string;
          sender_id: string;
          receiver_id: string;
          status: 'pending' | 'accepted' | 'declined' | 'canceled';
          created_at: string;
          responded_at: string | null;
        };
        Insert: { sender_id: string; receiver_id: string };
        Update: { status?: 'pending' | 'accepted' | 'declined' | 'canceled'; responded_at?: string | null };
      };
      conversations: {
        Row: {
          id: string;
          participant_a_id: string;
          participant_b_id: string;
          created_at: string;
          last_message_at: string;
        };
        Insert: { participant_a_id: string; participant_b_id: string };
        Update: { last_message_at?: string };
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          content_text: string;
          created_at: string;
          read_at: string | null;
        };
        Insert: { conversation_id: string; sender_id: string; content_text: string };
        Update: { read_at?: string | null };
      };
      reports: {
        Row: {
          id: string;
          reporter_id: string;
          reported_id: string;
          reason: string;
          description: string | null;
          status: 'open' | 'reviewing' | 'actioned' | 'dismissed';
          created_at: string;
        };
        Insert: { reporter_id: string; reported_id: string; reason: string; description?: string | null };
        Update: never;
      };
      blocks: {
        Row: { id: string; blocker_id: string; blocked_id: string; created_at: string };
        Insert: { blocker_id: string; blocked_id: string };
        Update: never;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
