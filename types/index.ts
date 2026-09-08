/** Shared type helpers over the generated Supabase schema. */
import type { Database } from './database';

export type { Database };
export type Tables = Database['public']['Tables'];
export type TableName = keyof Tables;
export type Row<T extends TableName> = Tables[T]['Row'];
export type Insert<T extends TableName> = Tables[T]['Insert'];
export type TableUpdate<T extends TableName> = Tables[T] extends { Update: infer U } ? U : never;

// Domain aliases — prefer these over raw table names in feature code.
export type User = Row<'users'>;
export type Profile = Row<'profiles'>;
export type ProfilePhoto = Row<'profile_photos'>;
export type SwipeAction = Row<'swipe_actions'>;
export type FriendRequest = Row<'friend_requests'>;
export type Conversation = Row<'conversations'>;
export type Message = Row<'messages'>;
export type Report = Row<'reports'>;
export type Block = Row<'blocks'>;
