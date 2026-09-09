export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      blocks: {
        Row: {
          blocked_id: string;
          blocker_id: string;
          created_at: string;
          id: string;
        };
        Insert: {
          blocked_id: string;
          blocker_id: string;
          created_at?: string;
          id?: string;
        };
        Update: {
          blocked_id?: string;
          blocker_id?: string;
          created_at?: string;
          id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'blocks_blocked_id_fkey';
            columns: ['blocked_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'blocks_blocker_id_fkey';
            columns: ['blocker_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      conversations: {
        Row: {
          created_at: string;
          id: string;
          last_message_at: string;
          participant_a_id: string;
          participant_b_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          last_message_at?: string;
          participant_a_id: string;
          participant_b_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          last_message_at?: string;
          participant_a_id?: string;
          participant_b_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'conversations_participant_a_id_fkey';
            columns: ['participant_a_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'conversations_participant_b_id_fkey';
            columns: ['participant_b_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      friend_requests: {
        Row: {
          created_at: string;
          id: string;
          receiver_id: string;
          responded_at: string | null;
          sender_id: string;
          status: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          receiver_id: string;
          responded_at?: string | null;
          sender_id: string;
          status?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          receiver_id?: string;
          responded_at?: string | null;
          sender_id?: string;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'friend_requests_receiver_id_fkey';
            columns: ['receiver_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'friend_requests_sender_id_fkey';
            columns: ['sender_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      messages: {
        Row: {
          content_text: string;
          conversation_id: string;
          created_at: string;
          id: string;
          read_at: string | null;
          sender_id: string;
        };
        Insert: {
          content_text: string;
          conversation_id: string;
          created_at?: string;
          id?: string;
          read_at?: string | null;
          sender_id: string;
        };
        Update: {
          content_text?: string;
          conversation_id?: string;
          created_at?: string;
          id?: string;
          read_at?: string | null;
          sender_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'messages_conversation_id_fkey';
            columns: ['conversation_id'];
            isOneToOne: false;
            referencedRelation: 'conversations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'messages_sender_id_fkey';
            columns: ['sender_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      personality_surveys: {
        Row: {
          answers: Json;
          completed_at: string | null;
          created_at: string;
          profile_id: string;
          updated_at: string;
        };
        Insert: {
          answers?: Json;
          completed_at?: string | null;
          created_at?: string;
          profile_id: string;
          updated_at?: string;
        };
        Update: {
          answers?: Json;
          completed_at?: string | null;
          created_at?: string;
          profile_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'personality_surveys_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: true;
            referencedRelation: 'active_profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'personality_surveys_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: true;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      profile_photos: {
        Row: {
          id: string;
          is_card_photo: boolean;
          moderation_status: string;
          order_index: number;
          profile_id: string;
          url: string;
        };
        Insert: {
          id?: string;
          is_card_photo?: boolean;
          moderation_status?: string;
          order_index?: number;
          profile_id: string;
          url: string;
        };
        Update: {
          id?: string;
          is_card_photo?: boolean;
          moderation_status?: string;
          order_index?: number;
          profile_id?: string;
          url?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'profile_photos_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'active_profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'profile_photos_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      profiles: {
        Row: {
          age: number;
          bio: string | null;
          created_at: string;
          display_name: string;
          gender: string;
          id: string;
          updated_at: string;
          user_id: string;
          wilaya: number;
        };
        Insert: {
          age: number;
          bio?: string | null;
          created_at?: string;
          display_name: string;
          gender: string;
          id?: string;
          updated_at?: string;
          user_id: string;
          wilaya: number;
        };
        Update: {
          age?: number;
          bio?: string | null;
          created_at?: string;
          display_name?: string;
          gender?: string;
          id?: string;
          updated_at?: string;
          user_id?: string;
          wilaya?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'profiles_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      rate_limits: {
        Row: {
          bucket_key: string;
          count: number;
          window_start: string;
        };
        Insert: {
          bucket_key: string;
          count?: number;
          window_start?: string;
        };
        Update: {
          bucket_key?: string;
          count?: number;
          window_start?: string;
        };
        Relationships: [];
      };
      reports: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          reason: string;
          reported_id: string;
          reporter_id: string;
          status: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          reason: string;
          reported_id: string;
          reporter_id: string;
          status?: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          reason?: string;
          reported_id?: string;
          reporter_id?: string;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'reports_reported_id_fkey';
            columns: ['reported_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reports_reporter_id_fkey';
            columns: ['reporter_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      swipe_actions: {
        Row: {
          action: string;
          created_at: string;
          id: string;
          swiped_id: string;
          swiper_id: string;
        };
        Insert: {
          action: string;
          created_at?: string;
          id?: string;
          swiped_id: string;
          swiper_id: string;
        };
        Update: {
          action?: string;
          created_at?: string;
          id?: string;
          swiped_id?: string;
          swiper_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'swipe_actions_swiped_id_fkey';
            columns: ['swiped_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'swipe_actions_swiper_id_fkey';
            columns: ['swiper_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      users: {
        Row: {
          account_status: string;
          created_at: string;
          deleted_at: string | null;
          id: string;
          phone_number: string | null;
        };
        Insert: {
          account_status?: string;
          created_at?: string;
          deleted_at?: string | null;
          id: string;
          phone_number?: string | null;
        };
        Update: {
          account_status?: string;
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          phone_number?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      active_profiles: {
        Row: {
          age: number | null;
          bio: string | null;
          created_at: string | null;
          display_name: string | null;
          gender: string | null;
          id: string | null;
          updated_at: string | null;
          user_id: string | null;
          wilaya: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'profiles_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Functions: {
      check_rate_limit: {
        Args: {
          p_action: string;
          p_max_count: number;
          p_window_seconds: number;
        };
        Returns: boolean;
      };
      get_conversation_previews: {
        Args: never;
        Returns: {
          conversation_id: string;
          last_message: string;
          last_message_at: string;
          other_age: number;
          other_card: string;
          other_name: string;
          other_user_id: string;
          other_wilaya: number;
          unread: number;
        }[];
      };
      get_discovery_candidates: {
        Args: { p_limit?: number };
        Returns: {
          age: number;
          bio: string;
          card_photo_url: string;
          display_name: string;
          gender: string;
          user_id: string;
          wilaya: number;
        }[];
      };
      get_request_inbox: {
        Args: never;
        Returns: {
          counterpart_age: number;
          counterpart_card: string;
          counterpart_name: string;
          counterpart_user_id: string;
          counterpart_wilaya: number;
          created_at: string;
          direction: string;
          id: string;
          receiver_id: string;
          sender_id: string;
          status: string;
        }[];
      };
      is_active: { Args: never; Returns: boolean };
      is_conversation_participant: {
        Args: { convo_id: string };
        Returns: boolean;
      };
      set_card_photo: { Args: { p_photo_id: string }; Returns: boolean };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    keyof (DefaultSchema['Tables'] & DefaultSchema['Views']) | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
