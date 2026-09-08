import { Pressable, Text, View } from 'react-native';

export interface MessageBubbleProps {
  text: string;
  mine: boolean;
  failed: boolean;
  sending?: boolean;
  onRetry?: () => void;
  testID?: string;
}

export function MessageBubble({ text, mine, failed, sending = false, onRetry, testID }: MessageBubbleProps) {
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
        {sending && !failed ? <Text className="text-xs text-faint">Envoi…</Text> : null}
        {failed ? (
          <Pressable testID={t('retry')} onPress={onRetry} hitSlop={10}>
            <Text className="text-xs font-bold text-destructive">Échec — réessayer</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
