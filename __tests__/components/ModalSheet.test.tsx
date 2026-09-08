import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { Modal } from '../../components/Modal';
import { Sheet } from '../../components/Sheet';

describe('Modal', () => {
  it('renders content when visible and nothing when hidden', () => {
    const { rerender } = render(
      <Modal visible={false} onClose={() => undefined} title="Confirm" testID="modal">
        <Text>Body</Text>
      </Modal>,
    );
    expect(() => screen.getByTestId('modal')).toThrow();

    rerender(
      <Modal visible onClose={() => undefined} title="Confirm" testID="modal">
        <Text>Body</Text>
      </Modal>,
    );
    expect(screen.getByText('Confirm')).toBeTruthy();
    expect(screen.getByText('Body')).toBeTruthy();
  });

  it('dismisses via scrim and close button', () => {
    const onClose = jest.fn();
    render(
      <Modal visible onClose={onClose} title="Confirm" testID="modal">
        <Text>Body</Text>
      </Modal>,
    );
    fireEvent.press(screen.getByText('Body'));
    // Scrim is hidden from screen readers by accessibilityViewIsModal (correct
    // iOS modal semantics) — sighted-pointer dismissal opts into hidden nodes.
    fireEvent.press(screen.getByTestId('modal-scrim', { includeHiddenElements: true }));
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.press(screen.getByTestId('modal-close'));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});

describe('Sheet', () => {
  it('renders content when visible and dismisses via scrim', () => {
    const onClose = jest.fn();
    const { rerender } = render(
      <Sheet visible={false} onClose={onClose} title="Options" testID="sheet">
        <Text>Sheet body</Text>
      </Sheet>,
    );
    expect(() => screen.getByTestId('sheet')).toThrow();

    rerender(
      <Sheet visible onClose={onClose} title="Options" testID="sheet">
        <Text>Sheet body</Text>
      </Sheet>,
    );
    expect(screen.getByTestId('sheet')).toBeTruthy();
    expect(screen.getByText('Sheet body')).toBeTruthy();
    expect(screen.getByText('Options')).toBeTruthy();
    fireEvent.press(screen.getByTestId('sheet-scrim', { includeHiddenElements: true }));
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.press(screen.getByTestId('sheet-close'));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
