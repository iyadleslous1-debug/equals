import { useState } from 'react';
import { Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { SURVEY_HOBBIES, type SurveyAnswers } from '@/lib/validation/schemas';

type Draft = Partial<SurveyAnswers>;
type Hobby = (typeof SURVEY_HOBBIES)[number];

export interface SurveyFormProps {
  initial: Draft;
  fieldErrors: Record<string, string>;
  pending: boolean;
  onSubmit: (draft: Draft) => void;
  testID?: string;
}

const HOBBY_LABELS: readonly (readonly [Hobby, string])[] = [
  ['outdoors', 'Outdoors'],
  ['cooking', 'Cooking'],
  ['sports', 'Sports'],
  ['reading', 'Reading'],
  ['gaming', 'Gaming'],
  ['music', 'Music'],
  ['travel', 'Travel'],
  ['art', 'Art'],
];

const VIBE_LABELS: readonly (readonly [SurveyAnswers['vibe'], string])[] = [
  ['homebody', 'Homebody'],
  ['cafes', 'Café person'],
  ['restaurants', 'Foodie'],
  ['outdoors', 'Outdoorsy'],
  ['events', 'Event-goer'],
];

const SPORTS_LABELS: readonly (readonly [SurveyAnswers['sports'], string])[] = [
  ['never', 'Never'],
  ['sometimes', 'Sometimes'],
  ['regular', 'Regular'],
];

const COOKING_LABELS: readonly (readonly [SurveyAnswers['cooking'], string])[] = [
  ['love', 'Love it'],
  ['sometimes', 'Sometimes'],
  ['never', 'Never'],
];

const TRAVEL_LABELS: readonly (readonly [SurveyAnswers['travel'], string])[] = [
  ['essential', 'Essential'],
  ['nice', 'Nice'],
  ['low', 'Low priority'],
];

const KIDS_LABELS: readonly (readonly [SurveyAnswers['kids'], string])[] = [
  ['yes', 'Yes'],
  ['maybe', 'Maybe'],
  ['no', 'No'],
];

const SMOKING_LABELS: readonly (readonly [SurveyAnswers['smoking'], string])[] = [
  ['no', 'No'],
  ['occasionally', 'Occasionally'],
  ['regularly', 'Regularly'],
];

function Question({
  title,
  hint,
  error,
  testID,
  children,
}: {
  title: string;
  hint?: string;
  error?: string;
  testID?: string;
  children: React.ReactNode;
}) {
  return (
    <View>
      <Text className="mb-2 text-sm font-semibold text-text">{title}</Text>
      {hint ? <Text className="mb-2 text-xs text-faint">{hint}</Text> : null}
      <View className="flex-row flex-wrap gap-2">{children}</View>
      {error ? (
        <Text testID={testID ? `${testID}-error` : undefined} className="mt-1 text-xs text-destructive">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

export function SurveyForm({ initial, fieldErrors, pending, onSubmit, testID }: SurveyFormProps) {
  const [hobbies, setHobbies] = useState<Hobby[]>(initial.hobbies ?? []);
  const [vibe, setVibe] = useState<SurveyAnswers['vibe'] | null>(initial.vibe ?? null);
  const [rhythm, setRhythm] = useState<number | null>(initial.rhythm ?? null);
  const [sports, setSports] = useState<SurveyAnswers['sports'] | null>(initial.sports ?? null);
  const [cooking, setCooking] = useState<SurveyAnswers['cooking'] | null>(initial.cooking ?? null);
  const [travel, setTravel] = useState<SurveyAnswers['travel'] | null>(initial.travel ?? null);
  const [family, setFamily] = useState<number | null>(initial.family ?? null);
  const [career, setCareer] = useState<number | null>(initial.career ?? null);
  const [kids, setKids] = useState<SurveyAnswers['kids'] | null>(initial.kids ?? null);
  const [smoking, setSmoking] = useState<SurveyAnswers['smoking'] | null>(initial.smoking ?? null);
  const t = (id: string): string => (testID ? `${testID}-${id}` : '');

  const toggleHobby = (value: Hobby): void => {
    setHobbies((prev) => {
      if (prev.includes(value)) return prev.filter((h) => h !== value);
      if (prev.length >= 3) return prev;
      return [...prev, value];
    });
  };

  const submit = (): void => {
    onSubmit({
      hobbies,
      ...(vibe === null ? {} : { vibe }),
      ...(rhythm === null ? {} : { rhythm }),
      ...(sports === null ? {} : { sports }),
      ...(cooking === null ? {} : { cooking }),
      ...(travel === null ? {} : { travel }),
      ...(family === null ? {} : { family }),
      ...(career === null ? {} : { career }),
      ...(kids === null ? {} : { kids }),
      ...(smoking === null ? {} : { smoking }),
    });
  };

  return (
    <View testID={testID} className="gap-5">
      <Question title="Your hobbies? Pick up to 3." error={fieldErrors.hobbies} testID={t('hobbies')}>
        {HOBBY_LABELS.map(([value, label]) => (
          <Chip
            key={value}
            label={label}
            selected={hobbies.includes(value)}
            onPress={() => toggleHobby(value)}
            multiSelect
            testID={t(`hobby-${value}`)}
          />
        ))}
      </Question>
      <Question title="You’re more of a…" error={fieldErrors.vibe} testID={t('vibe')}>
        {VIBE_LABELS.map(([value, label]) => (
          <Chip
            key={value}
            label={label}
            selected={vibe === value}
            onPress={() => setVibe(value)}
            testID={t(`vibe-${value}`)}
          />
        ))}
      </Question>
      <Question
        title="Night owl or early bird?"
        hint="1 = up at dawn, 5 = up all night"
        error={fieldErrors.rhythm}
        testID={t('rhythm')}
      >
        {[1, 2, 3, 4, 5].map((n) => (
          <Chip
            key={n}
            label={String(n)}
            selected={rhythm === n}
            onPress={() => setRhythm(n)}
            testID={t(`rhythm-${n}`)}
          />
        ))}
      </Question>
      <Question title="Sports?" error={fieldErrors.sports} testID={t('sports')}>
        {SPORTS_LABELS.map(([value, label]) => (
          <Chip
            key={value}
            label={label}
            selected={sports === value}
            onPress={() => setSports(value)}
            testID={t(`sports-${value}`)}
          />
        ))}
      </Question>
      <Question title="Who cooks?" error={fieldErrors.cooking} testID={t('cooking')}>
        {COOKING_LABELS.map(([value, label]) => (
          <Chip
            key={value}
            label={label}
            selected={cooking === value}
            onPress={() => setCooking(value)}
            testID={t(`cooking-${value}`)}
          />
        ))}
      </Question>
      <Question title="Travel is…" error={fieldErrors.travel} testID={t('travel')}>
        {TRAVEL_LABELS.map(([value, label]) => (
          <Chip
            key={value}
            label={label}
            selected={travel === value}
            onPress={() => setTravel(value)}
            testID={t(`travel-${value}`)}
          />
        ))}
      </Question>
      <Question title="How important is family?" error={fieldErrors.family} testID={t('family')}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Chip
            key={n}
            label={String(n)}
            selected={family === n}
            onPress={() => setFamily(n)}
            testID={t(`family-${n}`)}
          />
        ))}
      </Question>
      <Question title="Career first?" error={fieldErrors.career} testID={t('career')}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Chip
            key={n}
            label={String(n)}
            selected={career === n}
            onPress={() => setCareer(n)}
            testID={t(`career-${n}`)}
          />
        ))}
      </Question>
      <Question title="Kids someday?" error={fieldErrors.kids} testID={t('kids')}>
        {KIDS_LABELS.map(([value, label]) => (
          <Chip
            key={value}
            label={label}
            selected={kids === value}
            onPress={() => setKids(value)}
            testID={t(`kids-${value}`)}
          />
        ))}
      </Question>
      <Question title="Smoking?" error={fieldErrors.smoking} testID={t('smoking')}>
        {SMOKING_LABELS.map(([value, label]) => (
          <Chip
            key={value}
            label={label}
            selected={smoking === value}
            onPress={() => setSmoking(value)}
            testID={t(`smoking-${value}`)}
          />
        ))}
      </Question>
      <Button title="Save" onPress={submit} loading={pending} testID={t('save')} />
    </View>
  );
}
