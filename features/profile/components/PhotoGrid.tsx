import { ActivityIndicator, Image, Pressable, Text, View } from 'react-native';
import { MAX_PHOTOS } from '@/constants/app';
import { HIT_SLOP } from '@/constants/theme';
import { Badge } from '@/components/Badge';
import { IconButton } from '@/components/IconButton';
import type { PhotoRow } from '../api';

export interface FailedUpload {
  uri: string;
  mimeType: string;
  error: string;
}

export interface PhotoGridProps {
  photos: PhotoRow[];
  urls: Record<string, string>;
  /** Photo ids whose signed URL failed — rendered as retry tiles, never spinners. */
  urlFailedIds?: string[];
  failed: FailedUpload[];
  uploading: boolean;
  onAdd: () => void;
  onRetry: (index: number) => void;
  onRemoveFailed: (index: number) => void;
  onRemovePhoto: (photoId: string) => void;
  onSetCard: (photoId: string) => void;
  onRetryUrl?: (photoId: string) => void;
  testID?: string;
}

function Tile({ children, testID }: { children: React.ReactNode; testID?: string }) {
  return (
    <View testID={testID} className="h-36 w-[31%] overflow-hidden rounded-2xl bg-ink">
      {children}
    </View>
  );
}

export function PhotoGrid({
  photos,
  urls,
  urlFailedIds = [],
  failed,
  uploading,
  onAdd,
  onRetry,
  onRemoveFailed,
  onRemovePhoto,
  onSetCard,
  onRetryUrl,
  testID,
}: PhotoGridProps): React.JSX.Element {
  const full = photos.length >= MAX_PHOTOS;
  return (
    <View testID={testID}>
      <View className="flex-row flex-wrap gap-2">
        {photos.map((photo) => {
          const uri = urls[photo.id];
          const urlFailed = urlFailedIds.includes(photo.id);
          return (
            <Tile key={photo.id}>
              {urlFailed ? (
                <View className="h-full w-full items-center justify-center border border-destructive p-1">
                  <Text className="text-center text-xs text-destructive" numberOfLines={2}>
                    Photo illisible.
                  </Text>
                  <Pressable
                    testID={testID ? `${testID}-retry-url-${photo.id}` : undefined}
                    onPress={() => onRetryUrl?.(photo.id)}
                    hitSlop={HIT_SLOP.slop}
                    accessibilityRole="button"
                    accessibilityLabel="Réessayer le chargement de la photo"
                  >
                    <Text className="mt-1 text-xs font-bold text-secondary">Réessayer</Text>
                  </Pressable>
                </View>
              ) : uri ? (
                <Image source={{ uri }} className="h-full w-full" />
              ) : (
                <View className="h-full w-full items-center justify-center bg-elevated">
                  <ActivityIndicator size="small" />
                </View>
              )}
              {photo.is_card_photo ? (
                <View
                  testID={testID ? `${testID}-card-badge-${photo.id}` : undefined}
                  className="absolute left-1 top-1"
                >
                  <Badge label="Principale" variant="success" />
                </View>
              ) : (
                <Pressable
                  testID={testID ? `${testID}-set-card-${photo.id}` : undefined}
                  onPress={() => onSetCard(photo.id)}
                  hitSlop={HIT_SLOP.slop}
                  accessibilityRole="button"
                  accessibilityLabel="Choisir comme photo principale"
                  className="absolute bottom-1 left-1 rounded-full bg-void/70 px-2 py-1"
                >
                  <Text className="text-xs font-bold text-text">Choisir</Text>
                </Pressable>
              )}
              {photo.moderation_status === 'pending' ? (
                <View className="absolute right-1 top-1">
                  <Badge label="En révision" variant="warning" />
                </View>
              ) : null}
              {photo.moderation_status === 'rejected' ? (
                <View className="absolute right-1 top-1">
                  <Badge label="Refusée — remplacez-la" variant="destructive" />
                </View>
              ) : null}
              <View className="absolute bottom-1 right-1">
                <IconButton
                  name="trash"
                  label="Supprimer la photo"
                  onPress={() => onRemovePhoto(photo.id)}
                  size={20}
                  testID={testID ? `${testID}-remove-${photo.id}` : undefined}
                />
              </View>
            </Tile>
          );
        })}
        {failed.map((item, index) => (
          <Tile key={`failed-${index}`} testID={testID ? `${testID}-failed-${index}` : undefined}>
            <View className="h-full w-full items-center justify-center border border-destructive p-1">
              <Text className="text-center text-xs text-destructive" numberOfLines={2}>
                {item.error}
              </Text>
              <Pressable
                testID={testID ? `${testID}-retry-${index}` : undefined}
                onPress={() => onRetry(index)}
                hitSlop={HIT_SLOP.slop}
                accessibilityRole="button"
                accessibilityLabel="Réessayer l’envoi de la photo"
              >
                <Text className="mt-1 text-xs font-bold text-secondary">Réessayer</Text>
              </Pressable>
              <Pressable
                testID={testID ? `${testID}-remove-failed-${index}` : undefined}
                onPress={() => onRemoveFailed(index)}
                hitSlop={HIT_SLOP.slop}
                accessibilityRole="button"
                accessibilityLabel="Retirer cette photo"
              >
                <Text className="mt-1 text-xs text-muted">Retirer</Text>
              </Pressable>
            </View>
          </Tile>
        ))}
        {!full ? (
          <Pressable
            testID={testID ? `${testID}-add` : undefined}
            onPress={onAdd}
            accessibilityRole="button"
            accessibilityLabel="Ajouter une photo"
            className="h-36 w-[31%] items-center justify-center rounded-2xl border border-dashed border-border"
          >
            {uploading ? <ActivityIndicator /> : <Text className="text-3xl text-muted">+</Text>}
          </Pressable>
        ) : null}
      </View>
      <Text className="mt-2 text-xs text-faint">
        {photos.length}/{MAX_PHOTOS} — 1 minimum pour apparaître dans Découverte
      </Text>
    </View>
  );
}
