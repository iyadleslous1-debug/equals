import { fireEvent, render, screen } from '@testing-library/react-native';
import { IconButton } from '../../components/IconButton';

describe('IconButton', () => {
  it('fires onPress and exposes an accessible name', async () => {
    const onPress = jest.fn();
    await render(<IconButton name="arrow-back" label="Go back" onPress={onPress} testID="back-btn" />);
    expect(screen.getByRole('button', { name: 'Go back' })).toBeTruthy();
    await fireEvent.press(screen.getByTestId('back-btn'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('is non-interactive when disabled', async () => {
    const onPress = jest.fn();
    await render(
      <IconButton name="arrow-back" label="Go back" onPress={onPress} disabled testID="back-btn" />,
    );
    await fireEvent.press(screen.getByTestId('back-btn'));
    expect(onPress).not.toHaveBeenCalled();
  });
});
