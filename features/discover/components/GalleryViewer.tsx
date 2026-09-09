import { useState } from 'react';
import { FlatList, Image, Text, View, useWindowDimensions } from 'react-native';

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
            className="h-96 w-full"
            resizeMode="cover"
            style={{ width }}
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
