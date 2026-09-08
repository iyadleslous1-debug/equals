import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { IconButton } from '@/components/IconButton';
import { LoadingState } from '@/components/LoadingState';
import { Sheet } from '@/components/Sheet';
import { useToast } from '@/components/Toast';
import { ChatInput } from '@/features/chat/components/ChatInput';
import { MessageBubble } from '@/features/chat/components/MessageBubble';
import { useMarkRead, useMessages, useOutbox, useSendMessage } from '@/features/chat/hooks';
import { BlockConfirm } from '@/features/safety/components/BlockConfirm';
import { ReportSheet } from '@/features/safety/components/ReportSheet';
import { useIsBlocked, useSafety } from '@/features/safety/hooks';
import type { MessageRow } from '@/features/chat/api';
import { useSessionStore } from '@/store/sessionStore';

function messageKey(item: MessageRow): string {
  return item.id;
}

export default function ThreadScreen(): React.JSX.Element {
  const router = useRouter();
  const params = useLocalSearchParams<{
    id?: string | string[];
    name?: string | string[];
    peer?: string | string[];
  }>();
  const rawId = Array.isArray(params.id) ? params.id[0] : params.id;
  const rawName = Array.isArray(params.name) ? params.name[0] : params.name;
  const rawPeer = Array.isArray(params.peer) ? params.peer[0] : params.peer;
  const conversationId = rawId ?? '';
  const peerName = rawName && rawName.trim() !== '' ? rawName : 'Conversation';
  const peerId = rawPeer ?? '';
  const threadQuery = useMessages(conversationId);
  const { send, sending, error: sendError } = useSendMessage(conversationId);
  const outbox = useOutbox();
  const safety = useSafety();
  const { show } = useToast();
  const [safetyOpen, setSafetyOpen] = useState(false);
  const [safetyView, setSafetyView] = useState<'menu' | 'report' | 'block'>('menu');
  const blockedByMe = useIsBlocked(peerId === '' ? null : peerId);
  const closeSafety = (): void => {
    setSafetyOpen(false);
    setSafetyView('menu');
    safety.reset();
  };
  const submitReport = async (reason: string, description: string): Promise<void> => {
    if (peerId === '') return;
    if (await safety.report(peerId, reason, description)) {
      show('Signalement envoyé.');
      closeSafety();
    }
  };
  const confirmBlock = async (): Promise<void> => {
    if (peerId === '') return;
    if (await safety.block(peerId)) {
      show('Utilisateur bloqué.');
      closeSafety();
    }
  };
  const confirmUnblock = async (): Promise<void> => {
    if (peerId === '') return;
    if (await safety.unblock(peerId)) {
      show('Blocage levé.');
      closeSafety();
    }
  };

  const myUserId = useSessionStore((s) => s.session?.user?.id ?? '');
  const [locked, setLocked] = useState(false);
  const missing = conversationId === '';

  // Stable identities so memoized MessageBubble rows skip on new arrivals.
  const renderMessage = useCallback(
    ({ item }: { item: MessageRow }) => (
      <MessageBubble
        text={item.content_text}
        mine={item.sender_id === myUserId}
        failed={false}
        testID={`thread-msg-${item.id}`}
      />
    ),
    [myUserId],
  );

  const loaded = threadQuery.data;
  const serverNewestFirst = loaded?.ok ? loaded.data : [];
  // A lock is only known after a rejected send; re-check on every focus so an
  // unblock (done elsewhere) doesn't strand the input behind a stale notice.
  useFocusEffect(
    useCallback(() => {
      setLocked(false);
      return undefined;
    }, []),
  );
  useMarkRead(conversationId, serverNewestFirst.length > 0 ? (serverNewestFirst[0]?.id ?? null) : null);

  if (missing) {
    return (
      <View className="flex-1 bg-void">
        <ErrorState
          message="Conversation introuvable."
          onRetry={() => router.back()}
          retryTitle="Retour"
          testID="thread-missing"
        />
      </View>
    );
  }

  const submit = async (text: string): Promise<void> => {
    const localId = outbox.queue(text);
    const result = await send(text);
    if (result.ok) {
      outbox.markSent(localId);
      await threadQuery.refetch();
    } else {
      if (result.error.code === 'chat/locked') setLocked(true);
      outbox.markFailed(localId);
    }
  };

  const pending = outbox.pendingList();
  const failed = outbox.failed();

  return (
    <View className="flex-1 bg-void">
      <View className="flex-row items-center border-b border-border px-2 py-3">
        <IconButton name="arrow-back" label="Retour" onPress={() => router.back()} testID="thread-back" />
        <Text className="ml-2 flex-1 text-lg font-bold text-text" numberOfLines={1}>
          {peerName}
        </Text>
        {peerId !== '' ? (
          <IconButton
            name="ellipsis-horizontal"
            label="Options de sécurité"
            onPress={() => {
              setSafetyView('menu');
              setSafetyOpen(true);
            }}
            testID="thread-more"
          />
        ) : null}
      </View>
      {threadQuery.isPending ? (
        <LoadingState label="Chargement des messages…" />
      ) : loaded && !loaded.ok ? (
        <ErrorState
          message={loaded.error.message}
          onRetry={() => threadQuery.refetch()}
          testID="thread-error"
        />
      ) : serverNewestFirst.length === 0 && failed.length === 0 ? (
        <View className="flex-1">
          <EmptyState title="Aucun message" message="Dites salam !" testID="thread-empty" />
        </View>
      ) : (
        <FlatList
          inverted
          data={serverNewestFirst}
          keyExtractor={messageKey}
          className="flex-1 px-4"
          contentContainerClassName="py-4"
          onEndReached={() => threadQuery.loadMore()}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            threadQuery.hasMore ? (
              <Button
                title="Charger plus anciens"
                onPress={() => threadQuery.loadMore()}
                variant="ghost"
                testID="thread-load-more"
              />
            ) : null
          }
          renderItem={renderMessage}
        />
      )}
      {pending.map((entry) => (
        <View key={entry.localId} className="px-4">
          <MessageBubble
            text={entry.text}
            mine
            sending
            failed={false}
            testID={`thread-pending-${entry.localId}`}
          />
        </View>
      ))}
      {failed.map((entry) => (
        <View key={entry.localId} className="px-4">
          <MessageBubble
            text={entry.text}
            mine
            failed
            onRetry={() => {
              outbox.discard(entry.localId);
              void submit(entry.text);
            }}
            testID={`thread-failed-${entry.localId}`}
          />
        </View>
      ))}
      {sendError && !locked ? (
        <Text
          testID="thread-send-error"
          accessibilityRole="alert"
          className="px-4 pb-1 text-center text-sm text-destructive"
        >
          {sendError}
        </Text>
      ) : null}
      <ChatInput
        onSend={(text) => void submit(text)}
        disabled={sending}
        locked={locked}
        testID="thread-input"
      />
      <Sheet
        visible={safetyOpen}
        onClose={() => {
          setSafetyOpen(false);
          setSafetyView('menu');
          safety.reset();
        }}
        title={peerName}
        testID="thread-safety"
      >
        {safetyView === 'menu' ? (
          <View className="gap-2">
            <Pressable
              testID="thread-safety-report"
              onPress={() => setSafetyView('report')}
              accessibilityRole="button"
              accessibilityLabel={`Signaler ${peerName}`}
              className="rounded-xl border border-border bg-ink px-4 py-3"
            >
              <Text className="text-base font-semibold text-text">Signaler {peerName}</Text>
            </Pressable>
            {blockedByMe ? (
              <Pressable
                testID="thread-safety-unblock"
                onPress={() => void confirmUnblock()}
                accessibilityRole="button"
                accessibilityLabel={`Débloquer ${peerName}`}
                className="rounded-xl border border-border bg-ink px-4 py-3"
              >
                <Text className="text-base font-semibold text-secondary">Débloquer {peerName}</Text>
              </Pressable>
            ) : (
              <Pressable
                testID="thread-safety-block"
                onPress={() => setSafetyView('block')}
                accessibilityRole="button"
                accessibilityLabel={`Bloquer ${peerName}`}
                className="rounded-xl border border-border bg-ink px-4 py-3"
              >
                <Text className="text-base font-semibold text-destructive">Bloquer {peerName}</Text>
              </Pressable>
            )}
          </View>
        ) : null}
        {safetyView === 'report' && peerId !== '' ? (
          <>
            <ReportSheet
              userName={peerName}
              onSubmit={(input) => void submitReport(input.reason, input.description)}
              onClose={() => setSafetyOpen(false)}
              pending={safety.status === 'pending'}
              testID="thread-report"
            />
            {safety.error ? (
              <Text
                testID="thread-safety-error"
                accessibilityRole="alert"
                className="mt-2 text-center text-sm text-destructive"
              >
                {safety.error}
              </Text>
            ) : null}
          </>
        ) : null}
        {safetyView === 'block' && peerId !== '' ? (
          <>
            <BlockConfirm
              userName={peerName}
              onConfirm={() => void confirmBlock()}
              onCancel={() => setSafetyOpen(false)}
              pending={safety.status === 'pending'}
              testID="thread-block"
            />
            {safety.error ? (
              <Text
                testID="thread-safety-error"
                accessibilityRole="alert"
                className="mt-2 text-center text-sm text-destructive"
              >
                {safety.error}
              </Text>
            ) : null}
          </>
        ) : null}
      </Sheet>
    </View>
  );
}
