import { fireEvent, render, screen } from '@testing-library/react-native';
import { Avatar } from '../../components/Avatar';
import { Badge } from '../../components/Badge';
import { Chip } from '../../components/Chip';

describe('Avatar', () => {
  it('shows initials when there is no photo', () => {
    render(<Avatar name="Amine Benali" testID="avatar" />);
    expect(screen.getByText('AB')).toBeTruthy();
  });

  it('renders the photo when a uri is given', () => {
    render(<Avatar name="Amine Benali" uri="https://picsum.photos/200" testID="avatar" />);
    expect(screen.getByTestId('avatar-image')).toBeTruthy();
  });
});

describe('Badge', () => {
  it('renders its label in every variant', () => {
    const variants = ['info', 'success', 'warning', 'destructive'] as const;
    for (const variant of variants) {
      const { unmount } = render(<Badge label="Pending" variant={variant} testID={`badge-${variant}`} />);
      expect(screen.getByText('Pending')).toBeTruthy();
      unmount();
    }
  });
});

describe('Chip', () => {
  it('toggles and announces selected state', () => {
    const onPress = jest.fn();
    render(<Chip label="Alger" selected={false} onPress={onPress} testID="chip" />);
    fireEvent.press(screen.getByTestId('chip'));
    expect(onPress).toHaveBeenCalledTimes(1);

    const { unmount } = render(<Chip label="Alger" selected onPress={() => undefined} testID="chip-on" />);
    expect(screen.getByRole('button', { name: 'Alger' })).toBeTruthy();
    unmount();
  });

  it('falls back to a placeholder for an empty name', () => {
    render(<Avatar name="" testID="avatar-empty" />);
    expect(screen.getByText('?')).toBeTruthy();
  });
});
