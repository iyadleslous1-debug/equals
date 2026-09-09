import { useState } from 'react';
import { FlatList, Text, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';

export interface GalleryViewerProps {
  urls: string[];
  name: string;
  testID?: string;
}

/** Full-bleed swipeable gallery with a position counter. URLs pre-signed. */
export function GalleryViewer({ urls, name, testID }: GalleryViewerProps) {
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const t = (id: string): string => (testID ? `${testID}-${id}` : '');
  if (urls.length === 0) return null;
  return (
    <View testID={testID}>
      <FlatList
        horizontal
        pagingEnabled
        data={urls}
        keyExtractor={(uri, index) => `${uri}-${index}`}
        testID={t('list')}
        onMomentumScrollEnd={(event) => {
          const page = Math.round(event.nativeEvent.contentOffset.x / Math.max(width, 1));
          setIndex(Math.min(page, urls.length - 1));
        }}
        renderItem={({ item }) => (
          <Image
            source={{ uri: item }}
            accessibilityRole="image"
            accessibilityLabel={`Photo of ${name}`}
            contentFit="cover"
            transition={300}
            style={{ width, height: 384 }}
          />
        )}
      />
      {urls.length > 1 ? (
        <Text testID={t('counter')} className="mt-1 text-center text-xs text-faint">
          {index + 1} / {urls.length}
        </Text>
      ) : null}
    </View>
  );
}
