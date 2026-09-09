import { useRouter } from 'expo-router';
import { memo, useCallback } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { ConversationRow } from '@/features/chat/components/ConversationRow';
import type { ConversationPreview } from '@/features/chat/api';
import { useConversations, usePreviewAvatars } from '@/features/chat/hooks';
import { previewText } from '@/features/chat/api';
import { useForegroundRefetch } from '@/hooks/useForegroundRefetch';

function timeLabel(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

/** Memoized row: preview updates re-render the list; untouched rows skip. */
const ConversationNavRow = memo(function ConversationNavRow({
  convo,
  avatarUri,
  onOpen,
}: {
  convo: ConversationPreview;
  avatarUri: string | null;
  onOpen: (convo: ConversationPreview) => void;
}) {
  const open = useCallback(() => onOpen(convo), [onOpen, convo]);
  return (
    <ConversationRow
      name={convo.otherName}
      preview={convo.lastMessage ? previewText(convo.lastMessage) : null}
      time={timeLabel(convo.lastMessageAt)}
      unread={convo.unread}
      avatarUri={avatarUri}
      onPress={open}
      testID={`chat-row-${convo.conversationId}`}
    />
  );
});

export default function ChatListScreen(): React.JSX.Element {
  const router = useRouter();
  const listQuery = useConversations();
  const { refetch } = listQuery;

  useForegroundRefetch(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );

  const loaded = listQuery.data;
  const convos = loaded?.ok ? loaded.data : [];
  const avatars = usePreviewAvatars(convos);

  const openConvo = useCallback(
    (convo: ConversationPreview) => {
      router.push({
        pathname: '/chat/[id]',
        params: {
          id: convo.conversationId,
          name: convo.otherName ?? '',
          peer: convo.otherUserId,
        },
      });
    },
    [router],
  );

  if (listQuery.isPending) return <LoadingState label="Chargement des conversations…" />;
  if (loaded && !loaded.ok) {
    return (
      <View className="flex-1 bg-void">
        <ErrorState message={loaded.error.message} onRetry={() => refetch()} testID="chat-error" />
      </View>
    );
  }

  return (
    <ScrollView className="bg-void">
      <View className="grow px-4 py-6">
        <Text className="mb-4 text-2xl font-bold text-text">Messages</Text>
        {convos.length === 0 ? (
          <EmptyState
            title="Aucune conversation"
            message="Acceptez une demande pour commencer à discuter."
            testID="chat-empty"
          />
        ) : (
          <View className="gap-2">
            {convos.map((convo) => (
              <ConversationNavRow
                key={convo.conversationId}
                convo={convo}
                avatarUri={avatars[convo.conversationId] ?? null}
                onOpen={openConvo}
              />
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
