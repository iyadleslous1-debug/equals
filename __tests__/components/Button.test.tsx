import { fireEvent, render, screen } from '@testing-library/react-native';
import { Button } from '../../components/Button';

describe('Button', () => {
  it('renders its title and fires onPress', () => {
    const onPress = jest.fn();
    render(<Button title="Save" onPress={onPress} testID="save-btn" />);
    expect(screen.getByText('Save')).toBeTruthy();
    fireEvent.press(screen.getByTestId('save-btn'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('is a named button for screen readers', () => {
    render(<Button title="Save" onPress={() => undefined} testID="save-btn" />);
    expect(screen.getByRole('button', { name: 'Save' })).toBeTruthy();
  });

  it('does not fire while loading or disabled', () => {
    const onPress = jest.fn();
    const { rerender } = render(<Button title="Save" onPress={onPress} loading testID="save-btn" />);
    fireEvent.press(screen.getByTestId('save-btn'));
    expect(onPress).not.toHaveBeenCalled();
    expect(screen.getByTestId('save-btn-loading')).toBeTruthy();

    rerender(<Button title="Save" onPress={onPress} disabled testID="save-btn" />);
    fireEvent.press(screen.getByTestId('save-btn'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('renders all variants without crashing', () => {
    const variants = ['primary', 'secondary', 'ghost', 'destructive'] as const;
    for (const variant of variants) {
      const { unmount } = render(
        <Button title={variant} onPress={() => undefined} variant={variant} testID={`btn-${variant}`} />,
      );
      expect(screen.getByTestId(`btn-${variant}`)).toBeTruthy();
      unmount();
    }
  });
});
