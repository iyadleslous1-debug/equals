import { fireEvent, render, screen } from '@testing-library/react-native';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import { LoadingState } from '../../components/LoadingState';
import { Skeleton } from '../../components/Skeleton';

describe('state components', () => {
  it('Skeleton renders a hidden decorative placeholder', () => {
    render(<Skeleton testID="skel" />);
    // Hidden from the accessibility tree by design — query must opt in.
    expect(screen.getByTestId('skel', { includeHiddenElements: true })).toBeTruthy();
  });

  it('LoadingState shows its label and announces progress', () => {
    render(<LoadingState label="Loading profiles…" testID="loading" />);
    expect(screen.getByText('Loading profiles…')).toBeTruthy();
    expect(screen.getByTestId('loading').props.accessibilityRole).toBe('progressbar');
  });

  it('EmptyState shows title, message and fires its action', () => {
    const onAction = jest.fn();
    render(
      <EmptyState
        title="No more profiles"
        message="Check back later"
        actionTitle="Refresh"
        onAction={onAction}
        testID="empty"
      />,
    );
    expect(screen.getByText('No more profiles')).toBeTruthy();
    expect(screen.getByText('Check back later')).toBeTruthy();
    fireEvent.press(screen.getByText('Refresh'));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('EmptyState renders without an action', () => {
    render(<EmptyState title="Nothing here" message="…" testID="empty" />);
    expect(screen.getByTestId('empty')).toBeTruthy();
  });

  it('ErrorState shows the message and fires retry', () => {
    const onRetry = jest.fn();
    render(<ErrorState message="No connection" onRetry={onRetry} testID="err" />);
    expect(screen.getByText('No connection')).toBeTruthy();
    fireEvent.press(screen.getByText('Try again'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
