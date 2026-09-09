import { fireEvent, render, screen } from '@testing-library/react-native';
import { RequestCard } from '../features/requests/components/RequestCard';

const base = {
  id: 'r1',
  created_at: '2026-09-08T00:00:00Z',
  profile: { display_name: 'Yasmine Haddad', age: 24, wilaya: 31 },
};

describe('RequestCard', () => {
  it('renders a received request with working actions', async () => {
    const onAccept = jest.fn();
    const onDecline = jest.fn();
    await render(
      <RequestCard
        request={{ ...base, status: 'pending' }}
        direction="received"
        acting={false}
        onAccept={onAccept}
        onDecline={onDecline}
        testID="req"
      />,
    );
    expect(screen.getByText('Yasmine Haddad, 24')).toBeTruthy();
    expect(screen.getByText(/31 — Oran/)).toBeTruthy();
    await fireEvent.press(screen.getByTestId('req-accept'));
    await fireEvent.press(screen.getByTestId('req-decline'));
    expect(onAccept).toHaveBeenCalledTimes(1);
    expect(onDecline).toHaveBeenCalledTimes(1);
  });

  it('disables actions while responding and degrades gracefully without a profile', async () => {
    const onAccept = jest.fn();
    await render(
      <RequestCard
        request={{ ...base, status: 'pending', profile: null }}
        direction="received"
        acting
        onAccept={onAccept}
        onDecline={() => undefined}
        testID="req"
      />,
    );
    expect(screen.getByText('User unavailable')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('req-accept'));
    expect(onAccept).not.toHaveBeenCalled();
  });

  it('shows status chips on sent requests without actions', async () => {
    const { unmount } = await render(
      <RequestCard request={{ ...base, status: 'pending' }} direction="sent" acting={false} testID="req" />,
    );
    expect(screen.getByText('Pending')).toBeTruthy();
    expect(() => screen.getByTestId('req-accept')).toThrow();
    await unmount();

    await render(
      <RequestCard request={{ ...base, status: 'accepted' }} direction="sent" acting={false} testID="req" />,
    );
    expect(screen.getByText('Accepted')).toBeTruthy();
  });
});
