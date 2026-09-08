import { act, renderHook } from '@testing-library/react-native';
import { fetchMessages, isConversationId, previewText } from '@/features/chat/api';
import { useOutbox } from '@/features/chat/hooks';

describe('isConversationId', () => {
  it('accepts UUIDs and rejects deep-link garbage without touching the network', async () => {
    expect(isConversationId('6ba7b810-9dad-11d1-80b4-00c04fd430c8')).toBe(true);
    expect(isConversationId('')).toBe(false);
    expect(isConversationId('thread-foo')).toBe(false);
    await expect(fetchMessages('not-a-uuid')).resolves.toEqual({
      ok: false,
      error: expect.objectContaining({ code: 'chat/not-found' }),
    });
  });
});

describe('previewText', () => {
  it('truncates long previews with an ellipsis', () => {
    expect(previewText('Salam, ça va ?', 10)).toBe('Salam, ça…');
    expect(previewText('Court', 10)).toBe('Court');
  });
});

describe('useOutbox', () => {
  it('tracks pending, sent and failed with retry preserving order', async () => {
    const { result } = await renderHook(() => useOutbox());
    let first = '';
    await act(async () => {
      first = result.current.queue('Salam');
    });
    expect(result.current.pending(first)).toBe(true);
    await act(async () => {
      result.current.markSent(first);
    });
    expect(result.current.pending(first)).toBe(false);
    let failedId = '';
    await act(async () => {
      failedId = result.current.queue('Deuxième');
    });
    await act(async () => {
      result.current.markFailed(failedId);
    });
    expect(result.current.failed().map((m) => m.text)).toEqual(['Deuxième']);
    await act(async () => {
      result.current.retry(failedId);
    });
    expect(result.current.pending(failedId)).toBe(true);
  });
});
