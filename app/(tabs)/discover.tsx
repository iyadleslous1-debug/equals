import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { IconButton } from '@/components/IconButton';
import { LoadingState } from '@/components/LoadingState';
import { Sheet } from '@/components/Sheet';
import { useToast } from '@/components/Toast';
import { UserCard } from '@/features/discover/components/UserCard';
import { FilterSheet } from '@/features/discover/components/FilterSheet';
import {
  useCardPhotoUrls,
  useCompatibility,
  useDeck,
  useDeckActions,
  useFilters,
  useSaveFilters,
} from '@/features/discover/hooks';
import type { DeckProfile } from '@/features/discover/api';
import { EMPTY_FILTERS } from '@/features/discover/api';
import { BlockConfirm } from '@/features/safety/components/BlockConfirm';
import { ReportSheet } from '@/features/safety/components/ReportSheet';
import { useSafety } from '@/features/safety/hooks';
import { SurveyPrompt } from '@/features/survey/components/SurveyPrompt';
import { useSurvey } from '@/features/survey/hooks';
import { orderByScore } from '@/lib/compatibility';
import { useForegroundRefetch } from '@/hooks/useForegroundRefetch';

type SafetyView = { mode: 'menu' } | { mode: 'report' } | { mode: 'block' } | null;

export default function DiscoverScreen(): React.JSX.Element {
  const router = useRouter();
  const filtersQuery = useFilters();
  const saver = useSaveFilters();
  const [filterOpen, setFilterOpen] = useState(false);
  const filters = filtersQuery.data?.ok === true ? filtersQuery.data.data : undefined;
  const filtersFailed = filtersQuery.isError || (filtersQuery.data !== undefined && !filtersQuery.data.ok);
  // Filters failed: fall back to defaults rather than deadlocking the deck
  // (the deck query stays disabled on undefined forever).
  const effectiveFilters = filters ?? (filtersFailed ? EMPTY_FILTERS : undefined);
  const deckQuery = useDeck(effectiveFilters);
  const [position, setPosition] = useState(0);
  const advance = useCallback(() => setPosition((p) => p + 1), []);
  const { acting, request, skip, error } = useDeckActions(advance);
  const loaded = deckQuery.data;
  const deck = useMemo(() => (loaded?.ok ? loaded.data : []), [loaded]);
  const urls = useCardPhotoUrls(deck);
  const { refetch } = deckQuery;
  const safety = useSafety();
  const { show } = useToast();
  const [target, setTarget] = useState<DeckProfile | null>(null);
  const [view, setView] = useState<SafetyView>(null);
  const [promptDismissed, setPromptDismissed] = useState(false);
  const surveyQuery = useSurvey();
  const surveyRow = surveyQuery.data?.ok ? surveyQuery.data.data : undefined;
  // Deferrable prompt only: hidden on fetch error, once a survey is completed,
  // or dismissed this session; resumable while unfinished. Discovery stays
  // fully usable without the survey.
  const completed = surveyRow?.completed_at !== null && surveyRow?.completed_at !== undefined;
  const showPrompt = !promptDismissed && surveyQuery.data?.ok === true && !completed;

  useForegroundRefetch(
    useCallback(() => {
      // Don't reorder the deck under an open safety sheet (target snapshot).
      if (target === null) void refetch();
    }, [refetch, target]),
  );

  // One-shot close on save success (guarded: fires only on the transition,
  // not every render — no cascade).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saver.status === 'success') setFilterOpen(false);
  }, [saver.status]);

  // Compatibility ordering (MVP2 piece 2): active ONLY when my own survey
  // is completed AND the server isn't already recency-ordering (sort=newest
  // would be destroyed by client reordering). Otherwise the server order
  // stands — no penalty, no different treatment.
  const applyCompat = completed && filters?.sort !== 'newest';
  const compatIds = useMemo(() => deck.map((d) => d.user_id), [deck]);
  const compatQuery = useCompatibility(applyCompat ? compatIds : []);
  const compatScores = useMemo(
    () => (compatQuery.data?.ok === true ? compatQuery.data.data : new Map<string, number>()),
    [compatQuery.data],
  );
  const orderedDeck = useMemo(
    () => (applyCompat ? orderByScore(deck, (d) => d.user_id, compatScores) : deck),
    [applyCompat, deck, compatScores],
  );
  // Direct index: acting past the last card empties the deck (correct).
  // Filter/compat changes restart at the top via applyFilters below.
  const current = orderedDeck[position];
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
  const openProfile = useCallback(() => {
    if (current !== undefined) {
      router.push({
        pathname: '/profile/[id]',
        params: {
          id: current.user_id,
          user_id: current.user_id,
          name: current.display_name,
          age: String(current.age),
          wilaya: String(current.wilaya),
          bio: current.bio ?? '',
        },
      });
    }
  }, [current, router]);

  // One paint, already ordered: when my survey is done we also wait for
  // scores, so the first card never swaps under the user mid-read.
  // Filters load first — the deck query stays disabled until prefs arrive.
  if (deckQuery.isPending || filtersQuery.isPending || (completed && compatQuery.isPending)) {
    return <LoadingState label="Loading profiles…" />;
  }
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
  // New prefs = new deck: restart at the top (event handler, not an effect).
  const applyFilters = (next: Parameters<typeof saver.save>[0]): void => {
    setPosition(0);
    saver.save(next);
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

  const filtersActive =
    filters !== undefined &&
    ((filters.age_min ?? null) !== null ||
      (filters.age_max ?? null) !== null ||
      (filters.wilayas ?? []).length > 0 ||
      (filters.sort ?? 'default') !== 'default');

  return (
    <ScrollView className="bg-void">
      <View className="grow px-4 py-6">
        <View className="mb-4 flex-row items-center justify-between">
          <Text className="text-2xl font-bold text-text">Discover</Text>
          <View className="flex-row items-center">
            {filtersActive ? (
              <Text testID="discover-filters-dot" className="mr-1 text-base text-primary">
                •
              </Text>
            ) : null}
            <IconButton
              name="options"
              label="Filters"
              onPress={() => {
                saver.reset();
                setFilterOpen(true);
              }}
              testID="discover-filters-open"
            />
          </View>
        </View>
        {filtersFailed ? (
          <Text testID="discover-filters-fallback" className="mb-2 text-center text-xs text-faint">
            Filters unavailable — showing everyone.
          </Text>
        ) : null}
        {showPrompt ? (
          <SurveyPrompt
            onStart={() => router.push('/survey')}
            onLater={() => setPromptDismissed(true)}
            resume={surveyRow !== null && surveyRow !== undefined}
            testID="discover-survey-prompt"
          />
        ) : null}
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
              onOpenProfile={openProfile}
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
      <Sheet
        visible={filterOpen}
        onClose={() => setFilterOpen(false)}
        title="Filters"
        testID="discover-filters"
      >
        {filters !== undefined ? (
          <>
            <FilterSheet
              key={JSON.stringify(filters)}
              initial={filters}
              compatAvailable={completed}
              fieldErrors={saver.fieldErrors}
              pending={saver.status === 'pending'}
              onApply={applyFilters}
              onReset={() => applyFilters({ age_min: null, age_max: null, wilayas: null, sort: 'default' })}
              testID="discover-filter-form"
            />
            {saver.error ? (
              <Text
                testID="discover-filters-error"
                accessibilityRole="alert"
                className="mt-2 text-center text-sm text-destructive"
              >
                {saver.error}
              </Text>
            ) : null}
          </>
        ) : null}
      </Sheet>
    </ScrollView>
  );
}
