import { fireEvent, render, screen } from '@testing-library/react-native';
import { BlockConfirm } from '../features/safety/components/BlockConfirm';
import { ReportSheet } from '../features/safety/components/ReportSheet';

describe('ReportSheet', () => {
  it('requires a reason before confirming and submits reason + description', async () => {
    const onSubmit = jest.fn();
    const onClose = jest.fn();
    await render(<ReportSheet userName="Yasmine" onSubmit={onSubmit} onClose={onClose} testID="report" />);
    expect(screen.getByText(/ne peut pas être annulé/)).toBeTruthy();
    const confirm = screen.getByTestId('report-confirm');
    await fireEvent.press(confirm);
    expect(onSubmit).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByText('Spam'));
    await fireEvent.changeText(screen.getByTestId('report-description'), 'Liens bizarres');
    await fireEvent.press(screen.getByTestId('report-confirm'));
    expect(onSubmit).toHaveBeenCalledWith({ reason: 'Spam', description: 'Liens bizarres' });
  });
});

describe('BlockConfirm', () => {
  it('states consequences plainly and routes confirm/cancel', async () => {
    const onConfirm = jest.fn();
    const onCancel = jest.fn();
    await render(
      <BlockConfirm userName="Yasmine" onConfirm={onConfirm} onCancel={onCancel} testID="block" />,
    );
    expect(screen.getByText(/ne pourra plus vous voir ni vous écrire/)).toBeTruthy();
    await fireEvent.press(screen.getByTestId('block-confirm'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    await fireEvent.press(screen.getByTestId('block-cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
