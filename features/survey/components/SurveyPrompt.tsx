import { Text, View } from 'react-native';
import { Button } from '@/components/Button';

export interface SurveyPromptProps {
  onStart: () => void;
  onLater: () => void;
  /** Started but unfinished row exists — offer resume instead of start. */
  resume?: boolean;
  testID?: string;
}

/** Deferrable "improve your matches" card. Never gates discovery. */
export function SurveyPrompt({ onStart, onLater, resume = false, testID }: SurveyPromptProps) {
  const t = (id: string): string => (testID ? `${testID}-${id}` : '');
  return (
    <View testID={testID} className="mb-4 rounded-2xl border border-border bg-ink p-4">
      <Text className="text-base font-bold text-text">
        {resume ? 'Continue your survey' : 'Get better matches'}
      </Text>
      <Text className="mt-1 text-sm text-muted">
        {resume
          ? 'Pick up where you left off — a finished survey sharpens your deck.'
          : 'Answer 10 quick questions so we can show your kind of people first.'}
      </Text>
      <View className="mt-3 flex-row gap-2">
        <View className="flex-1">
          <Button title={resume ? 'Continue' : 'Start'} onPress={onStart} testID={t('start')} />
        </View>
        <View className="flex-1">
          <Button title="Later" onPress={onLater} variant="secondary" testID={t('later')} />
        </View>
      </View>
    </View>
  );
}
