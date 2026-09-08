import { fireEvent, render, screen } from '@testing-library/react-native';
import { Input } from '../../components/Input';

describe('Input', () => {
  it('renders label and forwards text changes', async () => {
    const onChangeText = jest.fn();
    await render(<Input label="Email" value="" onChangeText={onChangeText} testID="email" />);
    expect(screen.getByText('Email')).toBeTruthy();
    await fireEvent.changeText(screen.getByTestId('email'), 'a@b.co');
    expect(onChangeText).toHaveBeenCalledWith('a@b.co');
  });

  it('shows hint when present and no error', async () => {
    await render(
      <Input label="Email" value="" onChangeText={() => undefined} hint="We never share it" testID="email" />,
    );
    expect(screen.getByText('We never share it')).toBeTruthy();
    expect(() => screen.getByTestId('email-error')).toThrow();
  });

  it('shows the error instead of the hint and links it for screen readers', async () => {
    await render(
      <Input
        label="Email"
        value="bad"
        onChangeText={() => undefined}
        hint="We never share it"
        error="Enter a valid email"
        testID="email"
      />,
    );
    expect(screen.getByTestId('email-error')).toBeTruthy();
    expect(screen.getByText('Enter a valid email')).toBeTruthy();
    expect(() => screen.getByText('We never share it')).toThrow();
  });
});
