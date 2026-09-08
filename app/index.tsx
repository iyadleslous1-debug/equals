/**
 * AuthGate — the only route that decides where the user belongs.
 *
 * loading → skeleton · guest + pending unconfirmed email → confirm screen ·
 * guest → login · authed → app (temporary session stub until the tab group
 * lands in a later piece — it also hosts the logout path under test).
 */
import { Redirect } from 'expo-router';
import { Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { usePendingEmail, useSignOut } from '@/features/auth/hooks';
import { useMyProfile } from '@/features/profile/hooks';
import { countVisiblePhotos, isProfileComplete } from '@/features/profile/validation';
import { useSessionStore } from '@/store/sessionStore';

function SessionStub({ email }: { email: string }): React.JSX.Element {
  const { signOut, status, error } = useSignOut();
  return (
    <View className="flex-1 items-center justify-center bg-void px-6">
      <Text className="text-2xl font-bold text-text">DZ Connect</Text>
      <Text className="mt-2 text-center text-sm text-muted">Connecté : {email}</Text>
      {error ? (
        <Text testID="gate-logout-error" className="mt-2 text-center text-sm text-destructive">
          {error.message}
        </Text>
      ) : null}
      <View className="mt-6">
        <Button
          title="Se déconnecter"
          onPress={() => void signOut()}
          loading={status === 'pending'}
          variant="secondary"
          testID="gate-logout"
        />
      </View>
    </View>
  );
}

export default function AuthGate(): React.JSX.Element {
  const status = useSessionStore((s) => s.status);
  const session = useSessionStore((s) => s.session);
  // Read failures fall back to `null` inside the hook (→ login), never hang.
  const { email: pending } = usePendingEmail(status === 'guest');
  const profileQuery = useMyProfile(status === 'authed');

  if (status === 'loading') return <LoadingState label="Chargement…" />;
  if (status === 'authed') {
    if (profileQuery.isPending) return <LoadingState label="Chargement…" />;
    if (profileQuery.data !== undefined && !profileQuery.data.ok) {
      return (
        <View className="flex-1 bg-void">
          <ErrorState
            message={profileQuery.data.error.message}
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
      return <Redirect href="/(onboarding)" />;
    }
    return <SessionStub email={session?.user?.email ?? ''} />;
  }
  if (pending === undefined) return <LoadingState label="Chargement…" />;
  if (pending !== null) {
    return <Redirect href={{ pathname: '/confirm', params: { email: pending } }} />;
  }
  return <Redirect href="/login" />;
}
