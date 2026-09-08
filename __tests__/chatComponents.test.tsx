import { fireEvent, render, screen } from '@testing-library/react-native';
import { ConversationRow } from '../features/chat/components/ConversationRow';
import { MessageBubble } from '../features/chat/components/MessageBubble';
import { ChatInput } from '../features/chat/components/ChatInput';

describe('ConversationRow', () => {
  it('renders name, preview, time and unread dot', async () => {
    const onPress = jest.fn();
    await render(
      <ConversationRow
        name="Yasmine Haddad"
        preview="Tu connais celui près de la Grande Poste ?"
        time="12:04"
        unread={3}
        onPress={onPress}
        testID="convo"
      />,
    );
    expect(screen.getByText('Yasmine Haddad')).toBeTruthy();
    expect(screen.getByText('Tu connais celui près de la Grande Poste ?')).toBeTruthy();
    expect(screen.getByTestId('convo-unread')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('convo'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('hides the unread dot at zero and degrades without a name', async () => {
    await render(
      <ConversationRow
        name={null}
        preview={null}
        time={null}
        unread={0}
        onPress={() => undefined}
        testID="convo"
      />,
    );
    expect(screen.getByText('Utilisateur indisponible')).toBeTruthy();
    expect(() => screen.getByTestId('convo-unread')).toThrow();
  });
});

describe('MessageBubble', () => {
  it('marks mine vs theirs and exposes failed retry', async () => {
    const onRetry = jest.fn();
    await render(<MessageBubble text="Salam" mine failed={false} onRetry={onRetry} testID="msg" />);
    expect(screen.getByTestId('msg-mine')).toBeTruthy();
    const { unmount } = await render(
      <MessageBubble text="Salam" mine={false} failed onRetry={onRetry} testID="msg2" />,
    );
    await fireEvent.press(screen.getByTestId('msg2-retry'));
    expect(onRetry).toHaveBeenCalledTimes(1);
    await unmount();
  });
});

describe('ChatInput', () => {
  it('sends trimmed text, blocks empty sends and locked chats', async () => {
    const onSend = jest.fn();
    const { unmount } = await render(
      <ChatInput onSend={onSend} disabled={false} locked={false} testID="chat-input" />,
    );
    await fireEvent.changeText(screen.getByTestId('chat-input-field'), '   ');
    await fireEvent.press(screen.getByTestId('chat-input-send'));
    expect(onSend).not.toHaveBeenCalled();
    await fireEvent.changeText(screen.getByTestId('chat-input-field'), 'Salam  ');
    await fireEvent.press(screen.getByTestId('chat-input-send'));
    expect(onSend).toHaveBeenCalledWith('Salam');
    await unmount();

    await render(<ChatInput onSend={() => undefined} disabled={false} locked testID="chat-input" />);
    expect(screen.getByText('Conversation verrouillée.')).toBeTruthy();
    expect(() => screen.getByTestId('chat-input-send')).toThrow();
  });
});
