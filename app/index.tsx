/**
 * AuthGate — the only route that decides where the user belongs.
 *
 * loading → skeleton · guest + pending unconfirmed email → confirm screen ·
 * guest → login · authed + incomplete profile → onboarding · authed +
 * complete profile → discovery tabs.
 */
import { Redirect } from 'expo-router';
import { View } from 'react-native';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { usePendingEmail } from '@/features/auth/hooks';
import { useMyProfile } from '@/features/profile/hooks';
import { countVisiblePhotos, isProfileComplete } from '@/features/profile/validation';
import { useSessionStore } from '@/store/sessionStore';

export default function AuthGate(): React.JSX.Element {
  const status = useSessionStore((s) => s.status);
  // Read failures fall back to `null` inside the hook (→ login), never hang.
  const { email: pending } = usePendingEmail(status === 'guest');
  const profileQuery = useMyProfile(status === 'authed');

  if (status === 'loading') return <LoadingState label="Chargement…" />;
  if (status === 'authed') {
    // Never decide on a stale snapshot mid-refetch (e.g. right after the
    // wizard saved): a stale "incomplete" would bounce back to onboarding.
    if (profileQuery.isPending || (profileQuery.isFetching && profileQuery.isStale)) {
      return <LoadingState label="Chargement…" />;
    }
    if (profileQuery.isError || (profileQuery.data !== undefined && !profileQuery.data.ok)) {
      return (
        <View className="flex-1 bg-void">
          <ErrorState
            message={
              profileQuery.data !== undefined && !profileQuery.data.ok
                ? profileQuery.data.error.message
                : 'Profil illisible. Réessayez.'
            }
            onRetry={() => profileQuery.refetch()}
            testID="gate-profile-error"
          />
        </View>
      );
    }
    const loaded = profileQuery.data;
    const profile = loaded?.ok ? loaded.data.profile : null;
    const photos = loaded?.ok ? loaded.data.photos : [];
    if (profile === null || !isProfileComplete(profile, countVisiblePhotos(photos))) {
      return <Redirect href="/setup" />;
    }
    return <Redirect href="/discover" />;
  }
  if (pending === undefined) return <LoadingState label="Chargement…" />;
  if (pending !== null) {
    return <Redirect href={{ pathname: '/confirm', params: { email: pending } }} />;
  }
  return <Redirect href="/login" />;
}
