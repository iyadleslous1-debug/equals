import { useEffect, useState } from 'react';
import { AppState, ScrollView, Text, View } from 'react-native';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { UserCard } from '@/features/discover/components/UserCard';
import { useCardPhotoUrls, useDeck, useDeckActions } from '@/features/discover/hooks';

export default function DiscoverScreen(): React.JSX.Element {
  const deckQuery = useDeck();
  const [position, setPosition] = useState(0);
  const { acting, request, skip, error } = useDeckActions(() => setPosition((p) => p + 1));
  const loaded = deckQuery.data;
  const deck = loaded?.ok ? loaded.data : [];
  const urls = useCardPhotoUrls(deck);
  const { refetch } = deckQuery;

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refetch();
    });
    return () => subscription.remove();
  }, [refetch]);

  if (deckQuery.isPending) return <LoadingState label="Chargement des profils…" />;
  if (loaded && !loaded.ok) {
    return (
      <View className="flex-1 bg-void">
        <ErrorState
          message={loaded.error.message}
          onRetry={() => deckQuery.refetch()}
          testID="discover-error"
        />
      </View>
    );
  }

  const current = deck[position];
  const refresh = (): void => {
    setPosition(0);
    void deckQuery.refetch();
  };

  return (
    <ScrollView className="bg-void">
      <View className="grow px-4 py-6">
        <Text className="mb-4 text-2xl font-bold text-text">Découverte</Text>
        {current === undefined ? (
          <EmptyState
            title="Plus de profils pour le moment"
            message="Revenez un peu plus tard — de nouveaux profils arrivent."
            actionTitle="Rafraîchir"
            onAction={refresh}
            testID="discover-empty"
          />
        ) : (
          <>
            <UserCard
              profile={current}
              photoUrl={urls[current.user_id] ?? null}
              acting={acting}
              onRequest={() => request(current.user_id)}
              onSkip={() => skip(current.user_id)}
              testID="discover"
            />
            {error ? (
              <Text testID="discover-action-error" className="mt-3 text-center text-sm text-destructive">
                {error}
              </Text>
            ) : null}
          </>
        )}
      </View>
    </ScrollView>
  );
}
