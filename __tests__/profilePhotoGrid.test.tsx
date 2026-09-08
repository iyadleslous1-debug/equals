import { fireEvent, render, screen } from '@testing-library/react-native';
import { PhotoGrid, type FailedUpload } from '../features/profile/components/PhotoGrid';
import type { PhotoRow } from '../features/profile/api';

const photo = (overrides: Partial<PhotoRow> = {}): PhotoRow => ({
  id: 'p1',
  profile_id: 'prof-1',
  url: 'https://picsum.photos/200',
  order_index: 0,
  is_card_photo: true,
  moderation_status: 'approved',
  ...overrides,
});

describe('PhotoGrid', () => {
  it('shows pending-review state instead of hiding unapproved photos', async () => {
    await render(
      <PhotoGrid
        photos={[photo({ id: 'p2', is_card_photo: false, moderation_status: 'pending' })]}
        urls={{ p2: 'https://picsum.photos/201' }}
        failed={[]}
        uploading={false}
        onAdd={() => undefined}
        onRetry={() => undefined}
        onRemoveFailed={() => undefined}
        onRemovePhoto={() => undefined}
        onSetCard={() => undefined}
        testID="grid"
      />,
    );
    expect(screen.getByText('En révision')).toBeTruthy();
  });

  it('marks the card photo and wires set-card on the others', async () => {
    const onSetCard = jest.fn();
    await render(
      <PhotoGrid
        photos={[photo(), photo({ id: 'p2', is_card_photo: false, moderation_status: 'approved' })]}
        urls={{ p1: 'https://picsum.photos/200', p2: 'https://picsum.photos/201' }}
        failed={[]}
        uploading={false}
        onAdd={() => undefined}
        onRetry={() => undefined}
        onRemoveFailed={() => undefined}
        onRemovePhoto={() => undefined}
        onSetCard={onSetCard}
        testID="grid"
      />,
    );
    expect(screen.getByTestId('grid-card-badge-p1')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('grid-set-card-p2'));
    expect(onSetCard).toHaveBeenCalledWith('p2');
  });

  it('lists failed uploads with retry and caps additions at six', async () => {
    const failed: FailedUpload[] = [
      { uri: 'file://x.jpg', mimeType: 'image/jpeg', error: 'Envoi impossible.' },
    ];
    const onRetry = jest.fn();
    const onAdd = jest.fn();
    const six = Array.from({ length: 6 }, (_, i) =>
      photo({ id: `p${i}`, is_card_photo: i === 0, moderation_status: 'approved' }),
    );
    const { unmount } = await render(
      <PhotoGrid
        photos={[photo()]}
        urls={{ p1: 'https://picsum.photos/200' }}
        failed={failed}
        uploading={false}
        onAdd={onAdd}
        onRetry={onRetry}
        onRemoveFailed={() => undefined}
        onRemovePhoto={() => undefined}
        onSetCard={() => undefined}
        testID="grid"
      />,
    );
    await fireEvent.press(screen.getByTestId('grid-retry-0'));
    expect(onRetry).toHaveBeenCalledWith(0);
    await unmount();

    await render(
      <PhotoGrid
        photos={six}
        urls={{}}
        failed={[]}
        uploading={false}
        onAdd={onAdd}
        onRetry={() => undefined}
        onRemoveFailed={() => undefined}
        onRemovePhoto={() => undefined}
        onSetCard={() => undefined}
        testID="grid"
      />,
    );
    expect(() => screen.getByTestId('grid-add')).toThrow();
    expect(screen.getByText(/6\/6/)).toBeTruthy();
  });

  it('badges rejected photos distinctly and retries dead signed URLs', async () => {
    const onRetryUrl = jest.fn();
    await render(
      <PhotoGrid
        photos={[
          photo({ id: 'p9', is_card_photo: false, moderation_status: 'rejected' }),
          photo({ id: 'p8', is_card_photo: false, moderation_status: 'approved' }),
        ]}
        urls={{ p9: 'https://picsum.photos/209' }}
        urlFailedIds={['p8']}
        failed={[]}
        uploading={false}
        onAdd={() => undefined}
        onRetry={() => undefined}
        onRemoveFailed={() => undefined}
        onRemovePhoto={() => undefined}
        onSetCard={() => undefined}
        onRetryUrl={onRetryUrl}
        testID="grid"
      />,
    );
    expect(screen.getByText('Refusée — remplacez-la')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('grid-retry-url-p8'));
    expect(onRetryUrl).toHaveBeenCalledWith('p8');
  });
});
