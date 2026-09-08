import { fireEvent, render, screen } from '@testing-library/react-native';
import { UserCard } from '../features/discover/components/UserCard';

const profile = {
  user_id: 'u-2',
  display_name: 'Yasmine Haddad',
  age: 24,
  gender: 'female',
  wilaya: 31,
  bio: 'Oranaise.',
  card_photo_url: 'https://picsum.photos/300',
};

describe('UserCard', () => {
  it('renders real profile data with actions', async () => {
    const onRequest = jest.fn();
    const onSkip = jest.fn();
    await render(
      <UserCard
        profile={profile}
        photoUrl={profile.card_photo_url}
        acting={false}
        onRequest={onRequest}
        onSkip={onSkip}
        testID="card"
      />,
    );
    expect(screen.getByText('Yasmine Haddad, 24')).toBeTruthy();
    expect(screen.getByText(/31 — Oran/)).toBeTruthy();
    expect(screen.getByText('Oranaise.')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('card-request'));
    await fireEvent.press(screen.getByTestId('card-skip'));
    expect(onRequest).toHaveBeenCalledTimes(1);
    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it('disables both actions while one is in flight', async () => {
    const onRequest = jest.fn();
    const onSkip = jest.fn();
    await render(
      <UserCard
        profile={profile}
        photoUrl={null}
        acting
        onRequest={onRequest}
        onSkip={onSkip}
        testID="card"
      />,
    );
    await fireEvent.press(screen.getByTestId('card-request'));
    await fireEvent.press(screen.getByTestId('card-skip'));
    expect(onRequest).not.toHaveBeenCalled();
    expect(onSkip).not.toHaveBeenCalled();
  });
});
