import { useCallback, useEffect, useRef } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { useToast } from '@/components/Toast';
import { RequestCard } from '@/features/requests/components/RequestCard';
import { useInboxPhotoUrls, useRequests, useRespond } from '@/features/requests/hooks';
import { useForegroundRefetch } from '@/hooks/useForegroundRefetch';
import type { InboxItem } from '@/features/requests/api';

function Section({
  title,
  items,
  emptyTitle,
  emptyMessage,
  onRefresh,
  testID,
  renderItem,
}: {
  title: string;
  items: InboxItem[];
  emptyTitle: string;
  emptyMessage: string;
  onRefresh: () => void;
  testID: string;
  renderItem: (item: InboxItem) => React.JSX.Element;
}) {
  return (
    <View className="mt-2">
      <Text className="mb-2 text-lg font-bold text-text">{title}</Text>
      {items.length === 0 ? (
        <EmptyState
          title={emptyTitle}
          message={emptyMessage}
          actionTitle="Rafraîchir"
          onAction={onRefresh}
          testID={`${testID}-empty`}
        />
      ) : (
        <View className="gap-2">{items.map(renderItem)}</View>
      )}
    </View>
  );
}

export default function RequestsScreen(): React.JSX.Element {
  const inboxQuery = useRequests();
  const { acting, accept, decline, error, notice } = useRespond();
  const { refetch } = inboxQuery;
  const { show } = useToast();
  const shownNotice = useRef(0);

  useForegroundRefetch(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );

  useEffect(() => {
    if (notice !== null && notice.id !== shownNotice.current) {
      shownNotice.current = notice.id;
      show(notice.text);
    }
  }, [notice, show]);

  const loaded = inboxQuery.data;
  const items = loaded?.ok ? loaded.data : [];
  const urls = useInboxPhotoUrls(items);

  if (inboxQuery.isPending) return <LoadingState label="Chargement des demandes…" />;
  if (loaded && !loaded.ok) {
    return (
      <View className="flex-1 bg-void">
        <ErrorState message={loaded.error.message} onRetry={() => refetch()} testID="requests-error" />
      </View>
    );
  }

  const received = items.filter((item) => item.direction === 'received' && item.status === 'pending');
  const sent = items.filter((item) => item.direction === 'sent');
  const toCardProps = (item: InboxItem) => ({
    id: item.id,
    status: item.status,
    created_at: item.created_at,
    profile: item.counterpart
      ? {
          display_name: item.counterpart.display_name,
          age: item.counterpart.age,
          wilaya: item.counterpart.wilaya,
          avatarUri: urls[item.id] ?? null,
        }
      : null,
  });

  return (
    <ScrollView className="bg-void">
      <View className="grow px-4 py-6">
        <Text className="mb-2 text-2xl font-bold text-text">Demandes</Text>
        {error ? (
          <Text testID="requests-action-error" className="mb-2 text-center text-sm text-destructive">
            {error}
          </Text>
        ) : null}
        <Section
          title="Reçues"
          items={received}
          emptyTitle="Aucune demande reçue"
          emptyMessage="Quand quelqu’un vous remarque, ce sera ici."
          onRefresh={() => refetch()}
          testID="requests-received"
          renderItem={(item) => (
            <RequestCard
              key={item.id}
              request={toCardProps(item)}
              direction="received"
              acting={acting}
              onAccept={() => accept(item.id)}
              onDecline={() => decline(item.id)}
              testID={`requests-${item.id}`}
            />
          )}
        />
        <Section
          title="Envoyées"
          items={sent}
          emptyTitle="Aucune demande envoyée"
          emptyMessage="Les profils que vous remarquez apparaissent ici."
          onRefresh={() => refetch()}
          testID="requests-sent"
          renderItem={(item) => (
            <RequestCard
              key={item.id}
              request={toCardProps(item)}
              direction="sent"
              acting={false}
              testID={`requests-${item.id}`}
            />
          )}
        />
      </View>
    </ScrollView>
  );
}
