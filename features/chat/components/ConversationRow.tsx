import { memo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Avatar } from '@/components/Avatar';

export interface ConversationRowProps {
  name: string | null;
  preview: string | null;
  time: string | null;
  unread: number;
  avatarUri?: string | null;
  onPress: () => void;
  testID?: string;
}

/** Memoized: chat list re-renders on every preview update; untouched rows skip. */
export const ConversationRow = memo(function ConversationRow({
  name,
  preview,
  time,
  unread,
  avatarUri,
  onPress,
  testID,
}: ConversationRowProps) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={name ?? 'Conversation'}
      className="flex-row items-center rounded-2xl border border-border bg-ink p-3"
    >
      <Avatar name={name ?? '?'} uri={avatarUri ?? undefined} size={52} />
      <View className="ml-3 flex-1">
        <View className="flex-row items-baseline justify-between">
          <Text className="flex-1 text-base font-bold text-text" numberOfLines={1}>
            {name ?? 'Utilisateur indisponible'}
          </Text>
          {time ? <Text className="ml-2 text-xs text-faint">{time}</Text> : null}
        </View>
        <View className="mt-1 flex-row items-center justify-between">
          <Text className="flex-1 text-sm text-muted" numberOfLines={1}>
            {preview ?? 'Aucun message.'}
          </Text>
          {unread > 0 ? (
            <View
              testID={testID ? `${testID}-unread` : undefined}
              accessibilityLabel={`${unread} non lus`}
              className="ml-2 h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1"
            >
              <Text className="text-xs font-bold text-onPrimary">{unread > 99 ? '99+' : unread}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
});
