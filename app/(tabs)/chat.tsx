import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { AppState, ScrollView, Text, View } from 'react-native';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { ConversationRow } from '@/features/chat/components/ConversationRow';
import { useConversations, usePreviewAvatars } from '@/features/chat/hooks';
import { previewText } from '@/features/chat/api';

function timeLabel(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export default function ChatListScreen(): React.JSX.Element {
  const router = useRouter();
  const listQuery = useConversations();
  const { refetch } = listQuery;

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refetch();
    });
    return () => subscription.remove();
  }, [refetch]);

  const loaded = listQuery.data;
  const convos = loaded?.ok ? loaded.data : [];
  const avatars = usePreviewAvatars(convos);

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
              <ConversationRow
                key={convo.conversationId}
                name={convo.otherName}
                preview={convo.lastMessage ? previewText(convo.lastMessage) : null}
                time={timeLabel(convo.lastMessageAt)}
                unread={convo.unread}
                avatarUri={avatars[convo.conversationId] ?? null}
                onPress={() =>
                  router.push({
                    pathname: '/chat/[id]',
                    params: {
                      id: convo.conversationId,
                      name: convo.otherName ?? '',
                      peer: convo.otherUserId,
                    },
                  })
                }
                testID={`chat-row-${convo.conversationId}`}
              />
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
