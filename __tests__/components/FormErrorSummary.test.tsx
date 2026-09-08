import { fireEvent, render, screen } from '@testing-library/react-native';
import { FormErrorSummary } from '../../components/FormErrorSummary';

describe('FormErrorSummary', () => {
  const errors = [
    { field: 'email', message: 'Enter a valid email' },
    { field: 'password', message: 'Use 8+ characters' },
  ];

  it('lists every error and routes taps to the field', () => {
    const onSelect = jest.fn();
    render(<FormErrorSummary errors={errors} onSelect={onSelect} testID="form-errors" />);
    expect(screen.getByRole('button', { name: 'Enter a valid email. Go to field.' })).toBeTruthy();
    fireEvent.press(screen.getByTestId('form-errors-email'));
    expect(onSelect).toHaveBeenCalledWith('email');
  });

  it('renders nothing when there are no errors', () => {
    render(<FormErrorSummary errors={[]} onSelect={() => undefined} testID="form-errors" />);
    expect(() => screen.getByTestId('form-errors')).toThrow();
  });
});
