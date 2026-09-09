import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { IconButton } from '@/components/IconButton';
import { LoadingState } from '@/components/LoadingState';
import { useToast } from '@/components/Toast';
import { Badge } from '@/components/Badge';
import { GalleryViewer } from '@/features/discover/components/GalleryViewer';
import { DECK_KEY, useAct, useCompatibility, useGallery } from '@/features/discover/hooks';
import { sendRequest, skipProfile } from '@/features/discover/api';
import { useSurvey } from '@/features/survey/hooks';
import { useSignedUrls } from '@/hooks/useSignedUrls';
import { compatibilityBand } from '@/lib/compatibility';
import { reportError } from '@/lib/reporting';
import { wilayaLabel, isValidWilaya } from '@/constants/wilayas';

function param(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
}

export default function ProfileDetailScreen(): React.JSX.Element {
  const router = useRouter();
  const params = useLocalSearchParams();
  const userId = param(params.user_id) || param(params.id);
  const name = param(params.name) || 'Profile';
  const age = param(params.age);
  const wilayaParam = Number(param(params.wilaya));
  const wilaya = isValidWilaya(wilayaParam) ? wilayaParam : null;
  const bio = param(params.bio);

  const mySurvey = useSurvey();
  const surveyDone =
    mySurvey.data?.ok === true &&
    mySurvey.data.data?.completed_at !== null &&
    mySurvey.data.data?.completed_at !== undefined;
  const galleryQuery = useGallery(userId);
  const compatQuery = useCompatibility(surveyDone && userId !== '' ? [userId] : []);
  const { acting, run } = useAct();
  const [actionError, setActionError] = useState<string | null>(null);
  const client = useQueryClient();
  const { show } = useToast();

  if (userId === '') {
    return (
      <View className="flex-1 bg-void">
        <ErrorState
          message="Profile not found."
          onRetry={() => router.back()}
          retryTitle="Back"
          testID="profile-missing"
        />
      </View>
    );
  }

  const act = (work: () => Promise<{ ok: boolean; error?: { message?: string } }>, done: string): void => {
    setActionError(null);
    void run(async () => {
      try {
        const result = await work();
        if (!result.ok) {
          setActionError(result.error?.message ?? 'Something went wrong. Try again.');
          return;
        }
      } catch (error) {
        reportError(error, { where: 'profile-detail/action' });
        setActionError('Something went wrong. Try again.');
        return;
      }
      show(done);
      void client.invalidateQueries({ queryKey: DECK_KEY });
      router.back();
    });
  };

  if (galleryQuery.isPending) return <LoadingState label="Loading profile…" />;
  const loaded = galleryQuery.data;
  if (loaded && !loaded.ok) {
    return (
      <View className="flex-1 bg-void">
        <ErrorState
          message={loaded.error.message}
          onRetry={() => galleryQuery.refetch()}
          testID="profile-error"
        />
      </View>
    );
  }

  return (
    <LoadedProfile
      name={name}
      age={age}
      wilaya={wilaya}
      bio={bio}
      photos={loaded?.ok ? loaded.data : []}
      compat={compatQuery.data?.ok === true ? (compatQuery.data.data.get(userId) ?? null) : null}
      acting={acting}
      actionError={actionError}
      onBack={() => router.back()}
      onRequest={() => act(() => sendRequest(userId), 'Request sent.')}
      onSkip={() => act(() => skipProfile(userId), 'Passed.')}
    />
  );
}

function LoadedProfile({
  name,
  age,
  wilaya,
  bio,
  photos,
  compat,
  acting,
  actionError,
  onBack,
  onRequest,
  onSkip,
}: {
  name: string;
  age: string;
  wilaya: number | null;
  bio: string;
  photos: { url: string; is_card_photo: boolean; order_index: number }[];
  compat: number | null;
  acting: boolean;
  actionError: string | null;
  onBack: () => void;
  onRequest: () => void;
  onSkip: () => void;
}) {
  const { urls, failedIds, reload } = useSignedUrls(
    'profile-gallery',
    photos,
    (photo) => photo.url,
    (photo) => photo.url,
  );
  const ordered = [...photos].sort(
    (a, b) => Number(b.is_card_photo) - Number(a.is_card_photo) || a.order_index - b.order_index,
  );
  const displayUrls = ordered.map((photo) => urls[photo.url]).filter((u): u is string => u !== undefined);
  const band = compatibilityBand(compat);
  if (photos.length === 0 || (displayUrls.length === 0 && failedIds.length === 0)) {
    // Empty gallery means excluded (blocked/inactive) or fully rejected —
    // never show stale header info or actions for such a profile.
    return (
      <View className="flex-1 bg-void">
        <EmptyState
          title="Profile unavailable"
          message="This profile can't be shown right now."
          actionTitle="Back"
          onAction={onBack}
          testID="profile-unavailable"
        />
      </View>
    );
  }
  return (
    <ScrollView className="bg-void">
      <View className="flex-row items-center px-2 py-3">
        <IconButton name="arrow-back" label="Back" onPress={onBack} testID="profile-back" />
        <Text className="ml-2 flex-1 text-lg font-bold text-text" numberOfLines={1}>
          {name}
        </Text>
      </View>
      {displayUrls.length > 0 ? (
        <GalleryViewer urls={displayUrls} name={name} testID="profile-gallery" />
      ) : (
        <View className="px-4 py-3">
          <Text className="text-center text-sm text-muted">Some photos couldn&apos;t load.</Text>
          <Button title="Retry" onPress={() => reload()} variant="ghost" testID="profile-photos-retry" />
        </View>
      )}
      <View className="px-4 py-4">
        <View className="flex-row items-center gap-2">
          <Text className="flex-1 text-xl font-bold text-text" numberOfLines={1}>
            {name}
            {age !== '' ? `, ${age}` : ''}
          </Text>
          {band ? (
            <Badge
              label={band}
              variant={band === 'Great match' ? 'success' : 'warning'}
              testID="profile-compat"
            />
          ) : null}
        </View>
        {wilaya !== null ? <Text className="mt-1 text-sm text-secondary">{wilayaLabel(wilaya)}</Text> : null}
        {bio !== '' ? <Text className="mt-2 text-sm text-muted">{bio}</Text> : null}
        {actionError ? (
          <Text
            testID="profile-action-error"
            accessibilityRole="alert"
            className="mt-3 text-center text-sm text-destructive"
          >
            {actionError}
          </Text>
        ) : null}
        <View className="mt-4 flex-row gap-2">
          <View className="flex-1">
            <Button
              title="Pass"
              onPress={onSkip}
              disabled={acting}
              variant="secondary"
              testID="profile-skip"
            />
          </View>
          <View className="flex-1">
            <Button title="Request" onPress={onRequest} loading={acting} testID="profile-request" />
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
