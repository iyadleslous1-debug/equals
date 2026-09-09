import { fireEvent, render, screen } from '@testing-library/react-native';
import { SurveyPrompt } from '../features/survey/components/SurveyPrompt';

describe('SurveyPrompt (MVP2 piece 1)', () => {
  it('routes Start and Later without gating anything', async () => {
    const onStart = jest.fn();
    const onLater = jest.fn();
    await render(<SurveyPrompt onStart={onStart} onLater={onLater} testID="prompt" />);
    expect(screen.getByText('Get better matches')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('prompt-start'));
    expect(onStart).toHaveBeenCalledTimes(1);
    await fireEvent.press(screen.getByTestId('prompt-later'));
    expect(onLater).toHaveBeenCalledTimes(1);
  });

  it('offers Continue copy in resume mode', async () => {
    await render(<SurveyPrompt resume onStart={() => undefined} onLater={() => undefined} testID="prompt" />);
    expect(screen.getByText('Continue your survey')).toBeTruthy();
    expect(screen.getByText('Continue')).toBeTruthy();
  });
});
