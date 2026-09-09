import { memo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { COLORS, HIT_SLOP } from '@/constants/theme';

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
    <View
      testID={testID}
      style={{ marginVertical: 4, maxWidth: '75%', alignSelf: mine ? 'flex-end' : 'flex-start' }}
    >
      <View
        testID={t(mine ? 'mine' : 'theirs')}
        style={{
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: mine ? COLORS.primary : COLORS.elevated,
          borderRadius: 18,
          borderBottomRightRadius: mine ? 4 : 18,
          borderBottomLeftRadius: mine ? 18 : 4,
          opacity: sending && !failed ? 0.6 : 1,
        }}
      >
        <Text style={{ fontSize: 16, color: mine ? COLORS.onPrimary : COLORS.text }}>{text}</Text>
      </View>
      <View style={{ marginTop: 4, flexDirection: 'row', justifyContent: mine ? 'flex-end' : 'flex-start' }}>
        {sending && !failed ? <Text className="text-xs text-faint">Sending…</Text> : null}
        {failed ? (
          <Pressable
            testID={t('retry')}
            onPress={onRetry}
            hitSlop={HIT_SLOP.slop}
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
