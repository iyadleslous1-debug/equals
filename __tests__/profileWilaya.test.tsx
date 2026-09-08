import { fireEvent, render, screen } from '@testing-library/react-native';
import { WilayaPicker } from '../features/profile/components/WilayaPicker';

describe('WilayaPicker', () => {
  it('searches all 58 wilayas instead of scrolling', () => {
    const onSelect = jest.fn();
    render(<WilayaPicker value={null} onSelect={onSelect} testID="wilaya" />);
    fireEvent.press(screen.getByTestId('wilaya-open'));
    fireEvent.changeText(screen.getByTestId('wilaya-search'), 'oran');
    expect(screen.getByText(/Oran/)).toBeTruthy();
    fireEvent.press(screen.getByText(/31 — Oran/));
    expect(onSelect).toHaveBeenCalledWith(31);
  });

  it('shows the current selection on the trigger', () => {
    render(<WilayaPicker value={16} onSelect={() => undefined} testID="wilaya" />);
    expect(screen.getByText(/16 — Alger/)).toBeTruthy();
  });
});
