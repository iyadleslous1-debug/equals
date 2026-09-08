import { fireEvent, render, screen } from '@testing-library/react-native';
import { Button } from '../../components/Button';

describe('Button', () => {
  it('renders its title and fires onPress', async () => {
    const onPress = jest.fn();
    await render(<Button title="Save" onPress={onPress} testID="save-btn" />);
    expect(screen.getByText('Save')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('save-btn'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('is a named button for screen readers', async () => {
    await render(<Button title="Save" onPress={() => undefined} testID="save-btn" />);
    expect(screen.getByRole('button', { name: 'Save' })).toBeTruthy();
  });

  it('does not fire while loading or disabled', async () => {
    const onPress = jest.fn();
    const { rerender } = await render(<Button title="Save" onPress={onPress} loading testID="save-btn" />);
    await fireEvent.press(screen.getByTestId('save-btn'));
    expect(onPress).not.toHaveBeenCalled();
    expect(screen.getByTestId('save-btn-loading')).toBeTruthy();

    await rerender(<Button title="Save" onPress={onPress} disabled testID="save-btn" />);
    await fireEvent.press(screen.getByTestId('save-btn'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('renders all variants without crashing', async () => {
    const variants = ['primary', 'secondary', 'ghost', 'destructive'] as const;
    for (const variant of variants) {
      const { unmount } = await render(
        <Button title={variant} onPress={() => undefined} variant={variant} testID={`btn-${variant}`} />,
      );
      expect(screen.getByTestId(`btn-${variant}`)).toBeTruthy();
      await unmount();
    }
  });
});
