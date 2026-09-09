import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { Sheet } from '@/components/Sheet';
import { useToast } from '@/components/Toast';
import { UserCard } from '@/features/discover/components/UserCard';
import { useCardPhotoUrls, useDeck, useDeckActions } from '@/features/discover/hooks';
import type { DeckProfile } from '@/features/discover/api';
import { BlockConfirm } from '@/features/safety/components/BlockConfirm';
import { ReportSheet } from '@/features/safety/components/ReportSheet';
import { useSafety } from '@/features/safety/hooks';
import { useForegroundRefetch } from '@/hooks/useForegroundRefetch';

type SafetyView = { mode: 'menu' } | { mode: 'report' } | { mode: 'block' } | null;

export default function DiscoverScreen(): React.JSX.Element {
  const deckQuery = useDeck();
  const [position, setPosition] = useState(0);
  const advance = useCallback(() => setPosition((p) => p + 1), []);
  const { acting, request, skip, error } = useDeckActions(advance);
  const loaded = deckQuery.data;
  const deck = loaded?.ok ? loaded.data : [];
  const urls = useCardPhotoUrls(deck);
  const { refetch } = deckQuery;
  const safety = useSafety();
  const { show } = useToast();
  const [target, setTarget] = useState<DeckProfile | null>(null);
  const [view, setView] = useState<SafetyView>(null);

  useForegroundRefetch(
    useCallback(() => {
      // Don't reorder the deck under an open safety sheet (target snapshot).
      if (target === null) void refetch();
    }, [refetch, target]),
  );

  const current = deck[position];
  const currentId = current?.user_id;
  // Stable callbacks so memoized UserCard skips re-renders on unrelated
  // parent churn (toast notices, safety-sheet state). All hooks stay above
  // the early returns (Rules of Hooks).
  const requestCurrent = useCallback(() => {
    if (currentId !== undefined) request(currentId);
  }, [request, currentId]);
  const skipCurrent = useCallback(() => {
    if (currentId !== undefined) skip(currentId);
  }, [skip, currentId]);
  const openSafety = useCallback(() => {
    if (current !== undefined) {
      setTarget(current);
      setView({ mode: 'menu' });
    }
  }, [current]);

  if (deckQuery.isPending) return <LoadingState label="Loading profiles…" />;
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

  const refresh = (): void => {
    setPosition(0);
    void deckQuery.refetch();
  };
  const closeSafety = (): void => {
    setTarget(null);
    setView(null);
    safety.reset();
  };
  const submitReport = async (userId: string, reason: string, description: string): Promise<void> => {
    if (await safety.report(userId, reason, description)) {
      show('Report sent.');
      closeSafety();
    }
  };
  const confirmBlock = async (userId: string): Promise<void> => {
    if (await safety.block(userId)) {
      show('User blocked.');
      closeSafety();
    }
  };

  return (
    <ScrollView className="bg-void">
      <View className="grow px-4 py-6">
        <Text className="mb-4 text-2xl font-bold text-text">Discover</Text>
        {current === undefined ? (
          <EmptyState
            title="No more profiles for now"
            message="Check back later — new people are joining."
            actionTitle="Refresh"
            onAction={refresh}
            testID="discover-empty"
          />
        ) : (
          <>
            <UserCard
              profile={current}
              photoUrl={urls[current.user_id] ?? null}
              acting={acting}
              onRequest={requestCurrent}
              onSkip={skipCurrent}
              onMore={openSafety}
              testID="discover"
            />
            {error ? (
              <Text
                testID="discover-action-error"
                accessibilityRole="alert"
                className="mt-3 text-center text-sm text-destructive"
              >
                {error}
              </Text>
            ) : null}
          </>
        )}
      </View>
      <Sheet
        visible={target !== null}
        onClose={closeSafety}
        title={target ? target.display_name : 'Options'}
        testID="discover-safety"
      >
        {target !== null && (view === null || view.mode === 'menu') ? (
          <View className="gap-2">
            <Pressable
              testID="discover-safety-report"
              onPress={() => setView({ mode: 'report' })}
              accessibilityRole="button"
              accessibilityLabel={`Report ${target.display_name}`}
              className="rounded-xl border border-border bg-ink px-4 py-3"
            >
              <Text className="text-base font-semibold text-text">Report {target.display_name}</Text>
            </Pressable>
            <Pressable
              testID="discover-safety-block"
              onPress={() => setView({ mode: 'block' })}
              accessibilityRole="button"
              accessibilityLabel={`Block ${target.display_name}`}
              className="rounded-xl border border-border bg-ink px-4 py-3"
            >
              <Text className="text-base font-semibold text-destructive">Block {target.display_name}</Text>
            </Pressable>
          </View>
        ) : null}
        {target !== null && view?.mode === 'report' ? (
          <>
            <ReportSheet
              userName={target.display_name}
              onSubmit={(input) => void submitReport(target.user_id, input.reason, input.description)}
              onClose={closeSafety}
              pending={safety.status === 'pending'}
              testID="discover-report"
            />
            {safety.error ? (
              <Text
                testID="discover-safety-error"
                accessibilityRole="alert"
                className="mt-2 text-center text-sm text-destructive"
              >
                {safety.error}
              </Text>
            ) : null}
          </>
        ) : null}
        {target !== null && view?.mode === 'block' ? (
          <>
            <BlockConfirm
              userName={target.display_name}
              onConfirm={() => void confirmBlock(target.user_id)}
              onCancel={closeSafety}
              pending={safety.status === 'pending'}
              testID="discover-block"
            />
            {safety.error ? (
              <Text
                testID="discover-safety-error"
                accessibilityRole="alert"
                className="mt-2 text-center text-sm text-destructive"
              >
                {safety.error}
              </Text>
            ) : null}
          </>
        ) : null}
      </Sheet>
    </ScrollView>
  );
}
