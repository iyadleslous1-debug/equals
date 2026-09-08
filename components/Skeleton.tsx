import { View, type DimensionValue } from 'react-native';

export interface SkeletonProps {
  testID?: string;
  width?: DimensionValue;
  height?: number;
  rounded?: boolean;
}

/** Decorative loading placeholder — hidden from screen readers. */
export function Skeleton({
  testID,
  width = '100%',
  height = 16,
  rounded = true,
}: SkeletonProps): React.JSX.Element {
  return (
    <View
      testID={testID}
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className={`bg-elevated ${rounded ? 'rounded-xl' : ''}`}
      style={{ width, height }}
    />
  );
}
