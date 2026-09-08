import { useRef, useState } from 'react';
import { Text, View, type TextInput as RNTextInput } from 'react-native';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { FormErrorSummary, type FieldError } from '@/components/FormErrorSummary';
import { Input } from '@/components/Input';
import { WilayaPicker } from './WilayaPicker';
import { parseWith, profileSchema, type ProfileInput } from '@/lib/validation/schemas';

export interface IdentityFormProps {
  initial: Partial<ProfileInput>;
  serverError: string | null;
  pending: boolean;
  onSubmit: (values: ProfileInput) => void;
  testID?: string;
}

export function IdentityForm({ initial, serverError, pending, onSubmit, testID }: IdentityFormProps) {
  const [name, setName] = useState(initial.display_name ?? '');
  const [age, setAge] = useState(initial.age !== undefined ? String(initial.age) : '');
  const [gender, setGender] = useState<'male' | 'female' | null>(
    initial.gender === 'male' || initial.gender === 'female' ? initial.gender : null,
  );
  const [wilaya, setWilaya] = useState<number | null>(initial.wilaya ?? null);
  const [bio, setBio] = useState(initial.bio ?? '');
  const [fields, setFields] = useState<Record<string, string>>({});
  const nameRef = useRef<RNTextInput>(null);
  const ageRef = useRef<RNTextInput>(null);
  const bioRef = useRef<RNTextInput>(null);

  const submit = (): void => {
    const candidate = {
      display_name: name,
      age,
      gender,
      wilaya,
      ...(bio.trim() === '' ? {} : { bio }),
    };
    const parsed = parseWith(profileSchema, candidate);
    if (!parsed.ok) {
      const next: Record<string, string> = {};
      for (const issue of (parsed.error.details as { path: (string | number)[]; message: string }[]) ?? []) {
        const key = String(issue.path[0] ?? 'form');
        if (next[key] === undefined) next[key] = issue.message;
      }
      setFields(next);
      return;
    }
    setFields({});
    onSubmit(parsed.data);
  };

  const summary: FieldError[] = [
    ...(fields.display_name ? [{ field: 'display_name', message: fields.display_name }] : []),
    ...(fields.age ? [{ field: 'age', message: fields.age }] : []),
    ...(fields.gender ? [{ field: 'gender', message: fields.gender }] : []),
    ...(fields.wilaya ? [{ field: 'wilaya', message: fields.wilaya }] : []),
    ...(fields.bio ? [{ field: 'bio', message: fields.bio }] : []),
  ];
  const focusField = (field: string): void => {
    if (field === 'display_name') nameRef.current?.focus();
    else if (field === 'age') ageRef.current?.focus();
    else if (field === 'bio') bioRef.current?.focus();
  };
  const t = (id: string): string => (testID ? `${testID}-${id}` : '');

  return (
    <View testID={testID} className="gap-4">
      {summary.length > 0 ? (
        <FormErrorSummary errors={summary} onSelect={focusField} testID={`${t('errors')}`} />
      ) : null}
      <Input
        ref={nameRef}
        label="Nom d’affichage"
        value={name}
        onChangeText={setName}
        autoComplete="name"
        error={fields.display_name}
        returnKeyType="next"
        onSubmitEditing={() => ageRef.current?.focus()}
        testID={t('name')}
      />
      <Input
        ref={ageRef}
        label="Âge"
        value={age}
        onChangeText={setAge}
        keyboardType="number-pad"
        error={fields.age}
        returnKeyType="next"
        testID={t('age')}
      />
      <View>
        <Text className="mb-2 text-sm font-semibold text-text">Genre</Text>
        <View className="flex-row gap-2">
          <Chip
            label="Homme"
            selected={gender === 'male'}
            onPress={() => setGender('male')}
            testID={t('gender-male')}
          />
          <Chip
            label="Femme"
            selected={gender === 'female'}
            onPress={() => setGender('female')}
            testID={t('gender-female')}
          />
        </View>
        {fields.gender ? (
          <Text testID={t('gender-error')} className="mt-1 text-xs text-destructive">
            {fields.gender}
          </Text>
        ) : null}
      </View>
      <View>
        <Text className="mb-2 text-sm font-semibold text-text">Wilaya</Text>
        <WilayaPicker value={wilaya} onSelect={setWilaya} testID={t('wilaya')} />
        {fields.wilaya ? (
          <Text testID={t('wilaya-error')} className="mt-1 text-xs text-destructive">
            {fields.wilaya}
          </Text>
        ) : null}
      </View>
      <Input
        ref={bioRef}
        label="Bio (optionnel)"
        value={bio}
        onChangeText={setBio}
        multiline
        numberOfLines={4}
        error={fields.bio}
        testID={t('bio')}
      />
      {serverError ? (
        <Text testID={t('server-error')} className="text-sm text-destructive">
          {serverError}
        </Text>
      ) : null}
      <Button title="Continuer" onPress={submit} loading={pending} testID={t('submit')} />
    </View>
  );
}
