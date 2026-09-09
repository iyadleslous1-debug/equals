import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { useToast } from '@/components/Toast';
import { SurveyForm } from '@/features/survey/components/SurveyForm';
import { useSaveSurvey, useSurvey } from '@/features/survey/hooks';
import { surveyAnswersSchema } from '@/lib/validation/schemas';

export default function SurveyScreen(): React.JSX.Element {
  const router = useRouter();
  const surveyQuery = useSurvey();
  const { save, status, error, fieldErrors } = useSaveSurvey();
  const { show } = useToast();
  const done = status === 'success';

  useEffect(() => {
    if (done) {
      show('Survey saved. Your deck just got smarter.');
      router.replace('/discover');
    }
  }, [done, show, router]);

  if (surveyQuery.isPending) return <LoadingState label="Loading survey…" />;
  const loaded = surveyQuery.data;
  if (loaded && !loaded.ok) {
    return (
      <View className="flex-1 bg-void">
        <ErrorState
          message={loaded.error.message}
          onRetry={() => surveyQuery.refetch()}
          testID="survey-error"
        />
      </View>
    );
  }

  const initial = loaded?.ok && loaded.data ? loaded.data.answers : {};
  // Stored answers are re-validated: a legacy/partial row prefills nothing
  // rather than a broken form. Keyed so background refetches resync state.
  const purified = surveyAnswersSchema.safeParse(initial);
  const prefill = purified.success ? purified.data : {};
  const formKey = JSON.stringify(prefill);
  return (
    <ScrollView className="bg-void">
      <View className="grow px-4 py-8">
        <Text className="text-2xl font-bold text-text">Help us match you</Text>
        <Text className="mt-2 text-sm text-muted">
          10 quick questions. Skip nothing — every answer sharpens your deck.
        </Text>
        <View className="mt-6">
          <SurveyForm
            key={formKey}
            initial={prefill}
            fieldErrors={fieldErrors}
            pending={status === 'pending'}
            onSubmit={(draft) => save(draft)}
            testID="survey"
          />
        </View>
        {error ? (
          <Text
            testID="survey-save-error"
            accessibilityRole="alert"
            className="mt-3 text-center text-sm text-destructive"
          >
            {error}
          </Text>
        ) : null}
      </View>
    </ScrollView>
  );
}
