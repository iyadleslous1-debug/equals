import { memo } from 'react';
import { Pressable, Text, View } from 'react-native';

export interface MessageBubbleProps {
  text: string;
  mine: boolean;
  failed: boolean;
  sending?: boolean;
  onRetry?: () => void;
  testID?: string;
}

/** Memoized: thread FlatList re-renders on every arrival; unchanged rows skip. */
export const MessageBubble = memo(function MessageBubble({
  text,
  mine,
  failed,
  sending = false,
  onRetry,
  testID,
}: MessageBubbleProps) {
  const t = (id: string): string => (testID ? `${testID}-${id}` : '');
  return (
    <View testID={testID} className={`my-1 max-w-[80%] ${mine ? 'self-end' : 'self-start'}`}>
      <View
        testID={t(mine ? 'mine' : 'theirs')}
        className={`rounded-2xl px-3 py-2 ${mine ? 'bg-primary' : 'bg-elevated'}`}
      >
        <Text className={`text-base ${mine ? 'text-onPrimary' : 'text-text'}`}>{text}</Text>
      </View>
      <View className={`mt-0.5 flex-row items-center ${mine ? 'justify-end' : 'justify-start'}`}>
        {sending && !failed ? <Text className="text-xs text-faint">Sending…</Text> : null}
        {failed ? (
          <Pressable
            testID={t('retry')}
            onPress={onRetry}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Failed — retry"
          >
            <Text className="text-xs font-bold text-destructive">Failed — retry</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
});
