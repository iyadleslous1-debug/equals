import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { IdentityForm } from '@/features/profile/components/IdentityForm';
import { PhotosStep } from '@/features/profile/components/PhotosStep';
import { ReviewStep } from '@/features/profile/components/ReviewStep';
import { getDraft, saveDraft, clearDraft } from '@/features/profile/draft';
import { useMyProfile, usePhotoUrls, useUpdateProfile } from '@/features/profile/hooks';
import { countVisiblePhotos, isProfileComplete } from '@/features/profile/validation';
import { createLogger } from '@/lib/logger';
import type { ProfileInput } from '@/lib/validation/schemas';

const log = createLogger('onboarding');
const TITLES = ['Your profile', 'Your photos', 'Review'];

/** Server rows carry extra keys — pick only the wizard fields, never spread. */
function toFields(profile: {
  display_name?: string;
  age?: number;
  gender?: string;
  wilaya?: number;
  bio?: string | null;
}): Partial<ProfileInput> {
  return {
    ...(profile.display_name ? { display_name: profile.display_name } : {}),
    ...(typeof profile.age === 'number' ? { age: profile.age } : {}),
    ...(profile.gender === 'male' || profile.gender === 'female' ? { gender: profile.gender } : {}),
    ...(typeof profile.wilaya === 'number' ? { wilaya: profile.wilaya } : {}),
    ...(profile.bio ? { bio: profile.bio } : {}),
  };
}

export default function OnboardingScreen(): React.JSX.Element {
  const router = useRouter();
  const profileQuery = useMyProfile();
  const update = useUpdateProfile();
  const [step, setStep] = useState<number | null>(null);
  const [fields, setFields] = useState<Partial<ProfileInput>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);

  useEffect(() => {
    getDraft().then((draft) => {
      setFields(draft?.fields ?? {});
      setStep(draft?.step ?? 0);
    });
  }, []);
  const loaded = profileQuery.data;
  const serverProfile = loaded?.ok ? loaded.data.profile : null;
  const serverPhotos = loaded?.ok ? loaded.data.photos : [];
  const { urls, failedIds, reload } = usePhotoUrls(serverPhotos);
  const returningComplete =
    serverProfile !== null && isProfileComplete(serverProfile, countVisiblePhotos(serverPhotos));

  // Returning user who somehow lands here with a finished profile and no
  // draft: out. A stale step-0 draft still walks the wizard (explicit choice
  // over surprising redirects).
  useEffect(() => {
    if (returningComplete && step === 0 && Object.keys(fields).length === 0) {
      router.replace('/');
    }
  }, [returningComplete, step, fields, router]);

  if (step === null || profileQuery.isPending) return <LoadingState label="Loading…" />;
  if (loaded && !loaded.ok) {
    return (
      <View className="flex-1 bg-void">
        <ErrorState
          message={loaded.error.message}
          onRetry={() => profileQuery.refetch()}
          testID="onboarding-error"
        />
      </View>
    );
  }

  const persistDraft = (draft: { step: number; fields: Partial<ProfileInput> }): void => {
    saveDraft(draft).catch((failure: unknown) =>
      log.warn('Draft not saved; photos are server-side.', { failure }),
    );
  };

  const identityDone = (values: ProfileInput): void => {
    setServerError(null);
    update.mutate(values, {
      onSuccess: (result) => {
        if (!result.ok) {
          setServerError(result.error.message);
          return;
        }
        setFields(values);
        persistDraft({ step: 1, fields: values });
        setStep(1);
      },
      onError: () => setServerError("Couldn't save. Try again."),
    });
  };

  const photosContinue = (): void => {
    persistDraft({ step: 2, fields });
    setStep(2);
  };

  const done = async (): Promise<void> => {
    setFinishing(true);
    try {
      // Never navigate on a stale snapshot: the photo-upload invalidation may
      // still be refetching, and the gate would bounce back here on old data.
      const fresh = await profileQuery.refetch();
      const data = fresh.data;
      const profile = data?.ok ? data.data.profile : null;
      const photos = data?.ok ? data.data.photos : [];
      if (profile === null || !isProfileComplete(profile, countVisiblePhotos(photos))) {
        setServerError('Profile incomplete. Check your info and photo.');
        return;
      }
      try {
        await clearDraft();
      } catch (failure: unknown) {
        log.warn('Draft not cleared.', { failure });
      }
      router.replace('/');
    } finally {
      setFinishing(false);
    }
  };

  return (
    <ScrollView className="bg-void">
      <View className="grow px-4 py-8">
        <Text testID="onboarding-step" className="text-xs font-bold text-muted">
          Step {step + 1}/3
        </Text>
        <Text className="mt-1 text-2xl font-bold text-text">{TITLES[step] ?? ''}</Text>
        <View className="mt-6">
          {step === 0 ? (
            <IdentityForm
              initial={{ ...toFields(serverProfile ?? {}), ...fields }}
              serverError={serverError}
              pending={update.status === 'pending'}
              onSubmit={identityDone}
              testID="onboarding-identity"
            />
          ) : null}
          {step === 1 ? (
            <PhotosStep
              photos={serverPhotos}
              urls={urls}
              urlFailedIds={failedIds}
              onRetryUrl={() => reload()}
              onBack={() => {
                persistDraft({ step: 0, fields });
                setStep(0);
              }}
              onContinue={photosContinue}
              testID="onboarding-photos"
            />
          ) : null}
          {step === 2 ? (
            <ReviewStep
              fields={{ ...toFields(serverProfile ?? {}), ...fields }}
              photoCount={countVisiblePhotos(serverPhotos)}
              pending={finishing}
              serverError={serverError}
              onBack={() => {
                persistDraft({ step: 1, fields });
                setStep(1);
              }}
              onDone={done}
              testID="onboarding-review"
            />
          ) : null}
        </View>
      </View>
    </ScrollView>
  );
}
