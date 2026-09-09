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
  it('shows the message, auto-dismisses, and supports manual dismiss', async () => {
    await render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );
    expect(() => screen.getByTestId('toast-message')).toThrow();

    await fireEvent.press(screen.getByTestId('trigger'));
    expect(screen.getByText('Saved')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Dismiss notification' })).toBeTruthy();

    await fireEvent.press(screen.getByTestId('toast-dismiss'));
    await act(async () => {
      jest.advanceTimersByTime(250);
    });
    expect(() => screen.getByTestId('toast-message')).toThrow();

    await fireEvent.press(screen.getByTestId('trigger'));
    expect(screen.getByText('Saved')).toBeTruthy();
    await act(async () => {
      jest.advanceTimersByTime(4000 + 250);
    });
    expect(() => screen.getByTestId('toast-message')).toThrow();
  });
});
