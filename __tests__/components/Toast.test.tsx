import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { ToastProvider, useToast } from '../../components/Toast';

jest.useFakeTimers();

function Trigger() {
  const { show } = useToast();
  return (
    <Text testID="trigger" onPress={() => show('Saved', { duration: 3000 })}>
      trigger
    </Text>
  );
}

describe('Toast', () => {
  it('shows the message, auto-dismisses, and supports manual dismiss', () => {
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );
    expect(() => screen.getByTestId('toast-message')).toThrow();

    fireEvent.press(screen.getByTestId('trigger'));
    expect(screen.getByText('Saved')).toBeTruthy();

    fireEvent.press(screen.getByTestId('toast-dismiss'));
    expect(() => screen.getByTestId('toast-message')).toThrow();

    fireEvent.press(screen.getByTestId('trigger'));
    expect(screen.getByText('Saved')).toBeTruthy();
    act(() => {
      jest.advanceTimersByTime(3000);
    });
    expect(() => screen.getByTestId('toast-message')).toThrow();
  });
});
