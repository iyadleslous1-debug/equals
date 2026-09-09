import { fireEvent, render, screen } from '@testing-library/react-native';
import { CodeInput } from '../../features/auth/components/CodeInput';

describe('CodeInput', () => {
  it('renders six cells and completes on six digits', async () => {
    const onComplete = jest.fn();
    const onChange = jest.fn();
    await render(<CodeInput onComplete={onComplete} onChange={onChange} testID="otp" />);
    for (let i = 0; i < 6; i += 1) {
      expect(screen.getByTestId(`otp-cell-${i}`)).toBeTruthy();
    }
    await fireEvent.changeText(screen.getByTestId('otp-input'), '123456');
    expect(screen.getByTestId('otp-cell-0')).toHaveTextContent('1');
    expect(screen.getByTestId('otp-cell-5')).toHaveTextContent('6');
    expect(onComplete).toHaveBeenCalledWith('123456');
    expect(onChange).toHaveBeenCalledWith('123456');
  });

  it('filters non-digits and does not complete early', async () => {
    const onComplete = jest.fn();
    await render(<CodeInput onComplete={onComplete} testID="otp" />);
    await fireEvent.changeText(screen.getByTestId('otp-input'), '12a4');
    expect(screen.getByTestId('otp-cell-0')).toHaveTextContent('1');
    expect(screen.getByTestId('otp-cell-2')).toHaveTextContent('4');
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('fires once per completed value, never on re-render spam', async () => {
    const onComplete = jest.fn();
    await render(<CodeInput onComplete={onComplete} testID="otp" />);
    const input = screen.getByTestId('otp-input');
    await fireEvent.changeText(input, '123456');
    await fireEvent.changeText(input, '123456');
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('announces itself as a six-digit code field', async () => {
    await render(<CodeInput onComplete={() => undefined} testID="otp" />);
    expect(screen.getByLabelText('6-digit confirmation code')).toBeTruthy();
  });
});
