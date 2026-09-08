import { useState } from 'react';
import { Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { PhotoGrid, type FailedUpload } from './PhotoGrid';
import { pickSinglePhoto } from '../pickPhoto';
import { useDeletePhoto, useSetCardPhoto, useUploadPhoto } from '../hooks';
import type { PhotoRow } from '../api';

export interface PhotosStepProps {
  photos: PhotoRow[];
  urls: Record<string, string>;
  urlFailedIds: string[];
  onRetryUrl: (photoId: string) => void;
  onBack: () => void;
  onContinue: () => void;
  testID?: string;
}

export function PhotosStep({
  photos,
  urls,
  urlFailedIds,
  onRetryUrl,
  onBack,
  onContinue,
  testID,
}: PhotosStepProps) {
  const upload = useUploadPhoto();
  const setCard = useSetCardPhoto();
  const remove = useDeletePhoto();
  const [failed, setFailed] = useState<FailedUpload[]>([]);
  const [pickError, setPickError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const t = (id: string): string => (testID ? `${testID}-${id}` : '');

  const failUpload = (uri: string, mimeType: string, message: string): void => {
    setFailed((prev) => {
      const existing = prev.findIndex((entry) => entry.uri === uri);
      if (existing >= 0) {
        return prev.map((entry, i) => (i === existing ? { ...entry, error: message } : entry));
      }
      return [...prev, { uri, mimeType, error: message }];
    });
  };

  const add = async (): Promise<void> => {
    setPickError(null);
    const picked = await pickSinglePhoto();
    if (!picked.ok) {
      setPickError(picked.error.message);
      return;
    }
    if (picked.data === null) return;
    try {
      const result = await upload.mutateAsync(picked.data);
      if (!result.ok) {
        failUpload(picked.data.uri, picked.data.mimeType ?? 'image/jpeg', result.error.message);
      }
    } catch {
      failUpload(picked.data.uri, picked.data.mimeType ?? 'image/jpeg', 'Envoi impossible. Réessayez.');
    }
  };

  const retry = async (index: number): Promise<void> => {
    const item = failed[index];
    if (!item) return;
    try {
      const result = await upload.mutateAsync({ uri: item.uri, mimeType: item.mimeType });
      if (result.ok) {
        setFailed((prev) => prev.filter((_, i) => i !== index));
      } else {
        failUpload(item.uri, item.mimeType, result.error.message);
      }
    } catch {
      failUpload(item.uri, item.mimeType, 'Envoi impossible. Réessayez.');
    }
  };

  const guarded = async (work: Promise<{ ok: boolean; error?: { message: string } }>): Promise<void> => {
    try {
      const result = await work;
      if (!result.ok) setActionError(result.error?.message ?? 'Action impossible. Réessayez.');
    } catch {
      setActionError('Action impossible. Réessayez.');
    }
  };

  return (
    <View testID={testID} className="gap-4">
      <Text className="text-sm text-muted">
        Ajoutez 1 à 6 photos. La première devient votre photo principale.
      </Text>
      <PhotoGrid
        photos={photos}
        urls={urls}
        urlFailedIds={urlFailedIds}
        failed={failed}
        uploading={upload.status === 'pending'}
        onAdd={() => void add()}
        onRetry={(index) => void retry(index)}
        onRemoveFailed={(index) => setFailed((prev) => prev.filter((_, i) => i !== index))}
        onRemovePhoto={(id) => {
          setActionError(null);
          void guarded(remove.mutateAsync(id));
        }}
        onSetCard={(id) => {
          setActionError(null);
          void guarded(setCard.mutateAsync(id));
        }}
        onRetryUrl={onRetryUrl}
        testID={t('grid')}
      />
      {pickError ? (
        <Text testID={t('pick-error')} className="text-sm text-destructive">
          {pickError}
        </Text>
      ) : null}
      {actionError ? (
        <Text testID={t('action-error')} className="text-sm text-destructive">
          {actionError}
        </Text>
      ) : null}
      <View className="flex-row gap-2">
        <View className="flex-1">
          <Button title="Retour" onPress={onBack} variant="secondary" testID={t('back')} />
        </View>
        <View className="flex-1">
          <Button
            title="Continuer"
            onPress={onContinue}
            disabled={photos.length < 1}
            testID={t('continue')}
          />
        </View>
      </View>
    </View>
  );
}
