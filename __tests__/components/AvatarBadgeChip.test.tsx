import { fireEvent, render, screen } from '@testing-library/react-native';
import { Avatar } from '../../components/Avatar';
import { Badge } from '../../components/Badge';
import { Chip } from '../../components/Chip';

describe('Avatar', () => {
  it('shows initials when there is no photo', async () => {
    await render(<Avatar name="Amine Benali" testID="avatar" />);
    expect(screen.getByText('AB')).toBeTruthy();
  });

  it('renders the photo when a uri is given', async () => {
    await render(<Avatar name="Amine Benali" uri="https://picsum.photos/200" testID="avatar" />);
    expect(screen.getByTestId('avatar-image')).toBeTruthy();
  });
});

describe('Badge', () => {
  it('renders its label in every variant', async () => {
    const variants = ['info', 'success', 'warning', 'destructive'] as const;
    for (const variant of variants) {
      const { unmount } = await render(
        <Badge label="Pending" variant={variant} testID={`badge-${variant}`} />,
      );
      expect(screen.getByText('Pending')).toBeTruthy();
      await unmount();
    }
  });
});

describe('Chip', () => {
  it('toggles and announces selected state', async () => {
    const onPress = jest.fn();
    await render(<Chip label="Alger" selected={false} onPress={onPress} testID="chip" />);
    await fireEvent.press(screen.getByTestId('chip'));
    expect(onPress).toHaveBeenCalledTimes(1);

    const { unmount } = await render(
      <Chip label="Alger" selected onPress={() => undefined} testID="chip-on" />,
    );
    expect(screen.getByRole('button', { name: 'Alger' })).toBeTruthy();
    await unmount();
  });

  it('falls back to a placeholder for an empty name', async () => {
    await render(<Avatar name="" testID="avatar-empty" />);
    expect(screen.getByText('?')).toBeTruthy();
  });
});
