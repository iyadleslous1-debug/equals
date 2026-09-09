# KIN — UI ENGINEERING SPECIFICATION

## Apple-Level Polish, Motion-First, Dark-Only

## Version 1.0 — Final

---

## DESIGN PHILOSOPHY

You are a 20-year Apple UI engineer. You have shipped iOS apps used by hundreds of millions. You obsess over:

- 60fps animations with proper easing curves
- Haptic feedback that feels physical
- Micro-interactions that surprise and delight
- Accessibility that doesn't compromise beauty
- Pixel-perfect spacing and typography

Your job: implement the complete UI for Kin with Apple-level polish. Every motion, every state, every edge case.

---

## TABLE OF CONTENTS

1. Design Tokens
2. Motion System
3. Component Specifications
   - Button System
   - Input System
   - Chip System
   - Card System
   - Sheet/Modal System
   - List System
   - Navigation System
   - State Components
4. Screen-Specific Motion
5. Accessibility Requirements
6. Performance Requirements
7. Deliverables Checklist

---

## 1. DESIGN TOKENS

### Color Palette (Dark-Only)

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        // Backgrounds
        bg: '#0F1419', // Primary background
        card: '#1A2028', // Card background
        elevated: '#252D38', // Elevated cards, sheets

        // Brand
        primary: '#3368A0', // Deep Ocean — CTAs, active states
        secondary: '#66A3BF', // Soft Steel — secondary actions
        tertiary: '#C8DFDB', // Pale Mist — subtle highlights

        // Text
        text: '#F2EFE7', // Warm Sand — primary text
        muted: '#8A9BA8', // Muted blue-grey — secondary text

        // UI
        border: '#2A3441', // Borders, dividers
        destructive: '#E5484D', // Errors, destructive actions
        success: '#30A46C', // Success states
        warning: '#F5A524', // Warning states
      },
    },
  },
};

// constants/theme.ts
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const typography = {
  // iOS Dynamic Type scale
  largeTitle: { size: 34, weight: '700', lineHeight: 41 },
  title1: { size: 28, weight: '700', lineHeight: 34 },
  title2: { size: 22, weight: '700', lineHeight: 28 },
  title3: { size: 20, weight: '600', lineHeight: 25 },
  headline: { size: 17, weight: '600', lineHeight: 22 },
  body: { size: 17, weight: '400', lineHeight: 22 },
  callout: { size: 16, weight: '400', lineHeight: 21 },
  subheadline: { size: 15, weight: '400', lineHeight: 20 },
  footnote: { size: 13, weight: '400', lineHeight: 18 },
  caption1: { size: 12, weight: '400', lineHeight: 16 },
  caption2: { size: 11, weight: '400', lineHeight: 13 },
};
```

---

## 2. MOTION SYSTEM

### Animation Curves

```javascript
// lib/animation.ts
import { Easing } from 'react-native-reanimated';

export const curves = {
  // Standard iOS ease-out (fast start, gentle stop)
  easeOut: Easing.bezier(0.25, 0.46, 0.45, 0.94),

  // iOS spring (physical, bouncy but controlled)
  spring: {
    damping: 15,
    stiffness: 150,
    mass: 1,
  },

  // Slow ease for screen transitions
  screenTransition: {
    damping: 20,
    stiffness: 120,
    mass: 0.8,
  },

  // Snappy for micro-interactions
  snappy: {
    damping: 25,
    stiffness: 300,
    mass: 0.5,
  },

  // Bouncy for success states
  bouncy: {
    damping: 12,
    stiffness: 200,
    mass: 0.8,
  },
};

export const durations = {
  instant: 0, // State changes, no animation
  fast: 150, // Button presses, toggles
  normal: 250, // Sheet opens, card transitions
  slow: 400, // Screen transitions, hero animations
  slower: 600, // Splash, onboarding reveals
};
```

### Haptic Feedback

```javascript
// lib/haptics.ts
import * as Haptics from 'expo-haptics';

export const haptics = {
  light: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  medium: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  heavy: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),

  success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  warning: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
  error: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),

  selection: () => Haptics.selectionAsync(),
};

// Usage mapping:
// - Button press: light
// - Tab switch: light
// - Chip select: selection
// - Swipe threshold: medium
// - Success action: success
// - Error: error
// - Destructive confirm: heavy
```

---

## 3. COMPONENT SPECIFICATIONS

### 3.1 BUTTON SYSTEM

#### Primary Button (Filled)

```typescript
// components/Button.tsx
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'ghost' | 'destructive';
  size: 'large' | 'medium' | 'small';
  loading?: boolean;
  disabled?: boolean;
  onPress: () => void;
  children: React.ReactNode;
}

// Visual spec:
// - Background: #3368A0 (primary)
// - Text: #FFFFFF, Inter-SemiBold
// - Height: 52pt (large), 44pt (medium), 36pt (small)
// - Border-radius: 16pt (large), 12pt (medium/small)
// - Padding: 16pt horizontal
// - Shadow: 0 4pt 12pt rgba(51, 104, 160, 0.3)

// Motion spec:
// Pressed (onPressIn):
//   - Scale: 0.96
//   - Background: darken 10%
//   - Duration: 100ms
//   - Haptic: light
//
// Released (onPressOut):
//   - Scale: 1.0
//   - Duration: 250ms, spring curve
//
// Loading:
//   - Show ActivityIndicator (white, small)
//   - Disable interaction
//   - Width stays fixed (no layout shift)
//   - Opacity: 0.8
//
// Disabled:
//   - Background: #2A3441
//   - Text: #8A9BA8
//   - No shadow
//   - Opacity: 0.6
```

**Implementation:**

```typescript
import React from 'react'
import { Pressable, Text, ActivityIndicator } from 'react-native'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import { haptics } from '../lib/haptics'

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

export function Button({
  variant = 'primary',
  size = 'large',
  loading = false,
  disabled = false,
  onPress,
  children,
}: ButtonProps) {
  const scale = useSharedValue(1)
  const opacity = useSharedValue(1)

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }))

  const handlePressIn = () => {
    scale.value = withSpring(0.96, { damping: 20, stiffness: 400 })
    haptics.light()
  }

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 150 })
  }

  const handlePress = () => {
    if (!disabled && !loading) {
      onPress()
    }
  }

  const getBackgroundColor = () => {
    if (disabled) return '#2A3441'
    switch (variant) {
      case 'primary': return '#3368A0'
      case 'secondary': return 'transparent'
      case 'ghost': return 'transparent'
      case 'destructive': return '#E5484D'
      default: return '#3368A0'
    }
  }

  const getTextColor = () => {
    if (disabled) return '#8A9BA8'
    switch (variant) {
      case 'primary': return '#FFFFFF'
      case 'secondary': return '#66A3BF'
      case 'ghost': return '#66A3BF'
      case 'destructive': return '#FFFFFF'
      default: return '#FFFFFF'
    }
  }

  const getBorder = () => {
    if (variant === 'secondary') {
      return { borderWidth: 1.5, borderColor: '#66A3BF' }
    }
    return {}
  }

  const getHeight = () => {
    switch (size) {
      case 'large': return 52
      case 'medium': return 44
      case 'small': return 36
      default: return 52
    }
  }

  return (
    <AnimatedPressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      disabled={disabled || loading}
      style={[
        animatedStyle,
        {
          backgroundColor: getBackgroundColor(),
          height: getHeight(),
          borderRadius: size === 'large' ? 16 : 12,
          paddingHorizontal: 16,
          alignItems: 'center',
          justifyContent: 'center',
          ...getBorder(),
        },
      ]}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading }}
    >
      {loading ? (
        <ActivityIndicator color="#FFFFFF" size="small" />
      ) : (
        <Text
          style={{
            color: getTextColor(),
            fontSize: 17,
            fontWeight: '600',
          }}
        >
          {children}
        </Text>
      )}
    </AnimatedPressable>
  )
}
```

#### Secondary Button (Outlined)

```typescript
// Same as Primary but:
// - Background: transparent
// - Border: 1.5pt solid #66A3BF
// - Text: #66A3BF
// - Pressed: Background rgba(102, 163, 191, 0.1)
```

#### Ghost Button (Text-only)

```typescript
// Same as Primary but:
// - Background: transparent
// - Text: #66A3BF, Inter-Medium
// - Height: 44pt
// - Pressed: Background rgba(102, 163, 191, 0.08), border-radius 8pt
```

#### Destructive Button

```typescript
// Same as Primary but:
// - Background: #E5484D
// - Pressed: #C43E42
// - Shadow: 0 4pt 12pt rgba(229, 72, 77, 0.3)
```

---

### 3.2 INPUT SYSTEM

#### Text Input

```typescript
// components/Input.tsx
interface InputProps {
  label?: string;
  hint?: string;
  error?: string;
  multiline?: boolean;
  numberOfLines?: number;
  keyboardType?: 'default' | 'email-address' | 'number-pad' | 'phone-pad';
  secureTextEntry?: boolean;
  maxLength?: number;
  disabled?: boolean;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

// Visual spec:
// Resting:
//   - Background: #1A2028
//   - Border: 1pt solid #2A3441
//   - Border-radius: 12pt
//   - Height: 52pt (single-line), min 100pt (multi-line)
//   - Padding: 16pt
//   - Text: #F2EFE7, Inter-Regular, 17pt
//   - Placeholder: #8A9BA8
//
// Focused:
//   - Border: 1.5pt solid #3368A0
//   - Shadow: 0 0 0 3pt rgba(51, 104, 160, 0.15)
//   - Animate border color over 200ms
//
// Error:
//   - Border: #E5484D
//   - Shadow: 0 0 0 3pt rgba(229, 72, 77, 0.15)
//   - Error text below: #E5484D, Inter-Regular, 13pt
//
// Disabled:
//   - Background: #252D38
//   - Text: #8A9BA8
//   - Opacity: 0.6
```

**Implementation:**

```typescript
import React, { useState } from 'react'
import { View, Text, TextInput, StyleSheet } from 'react-native'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'

export function Input({
  label,
  hint,
  error,
  multiline = false,
  keyboardType = 'default',
  secureTextEntry = false,
  maxLength,
  disabled = false,
  value,
  onChangeText,
  placeholder,
}: InputProps) {
  const [focused, setFocused] = useState(false)
  const borderColor = useSharedValue('#2A3441')
  const shadowOpacity = useSharedValue(0)

  const animatedStyle = useAnimatedStyle(() => ({
    borderColor: borderColor.value,
    shadowOpacity: shadowOpacity.value,
  }))

  const handleFocus = () => {
    setFocused(true)
    borderColor.value = withTiming(error ? '#E5484D' : '#3368A0', { duration: 200 })
    shadowOpacity.value = withTiming(0.15, { duration: 200 })
  }

  const handleBlur = () => {
    setFocused(false)
    borderColor.value = withTiming(error ? '#E5484D' : '#2A3441', { duration: 200 })
    shadowOpacity.value = withTiming(0, { duration: 200 })
  }

  return (
    <View style={styles.container}>
      {label && (
        <Text style={styles.label}>{label}</Text>
      )}
      <Animated.View
        style={[
          styles.inputContainer,
          animatedStyle,
          multiline && styles.multiline,
          disabled && styles.disabled,
        ]}
      >
        <TextInput
          style={[
            styles.input,
            multiline && styles.multilineInput,
          ]}
          value={value}
          onChangeText={onChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          placeholderTextColor="#8A9BA8"
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry}
          maxLength={maxLength}
          editable={!disabled}
          multiline={multiline}
          accessibilityLabel={label}
          accessibilityHint={hint}
        />
      </Animated.View>
      {error && (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      )}
      {hint && !error && (
        <Text style={styles.hint}>{hint}</Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 15,
    fontWeight: '500',
    color: '#F2EFE7',
    marginBottom: 8,
  },
  inputContainer: {
    backgroundColor: '#1A2028',
    borderWidth: 1,
    borderRadius: 12,
    borderColor: '#2A3441',
    shadowColor: '#3368A0',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 3,
    elevation: 0,
  },
  input: {
    height: 52,
    paddingHorizontal: 16,
    fontSize: 17,
    color: '#F2EFE7',
  },
  multiline: {
    minHeight: 100,
  },
  multilineInput: {
    height: 'auto',
    minHeight: 100,
    paddingTop: 12,
    paddingBottom: 12,
    textAlignVertical: 'top',
  },
  disabled: {
    backgroundColor: '#252D38',
    opacity: 0.6,
  },
  error: {
    fontSize: 13,
    color: '#E5484D',
    marginTop: 6,
  },
  hint: {
    fontSize: 13,
    color: '#8A9BA8',
    marginTop: 6,
  },
})
```

---

### 3.3 CHIP SYSTEM

#### Single-Select Chip

```typescript
// components/Chip.tsx
interface ChipProps {
  selected: boolean;
  onPress: () => void;
  children: React.ReactNode;
  multiSelect?: boolean;
}

// Visual spec:
// Resting:
//   - Background: #1A2028
//   - Border: 1pt solid #2A3441
//   - Text: #8A9BA8, Inter-Medium, 15pt
//   - Height: 40pt
//   - Padding: 12pt horizontal
//   - Border-radius: 20pt (fully rounded)
//
// Selected (single):
//   - Background: #3368A0
//   - Border: transparent
//   - Text: #FFFFFF
//   - Scale: 1.05
//   - Haptic: selection
//   - Duration: 150ms
//
// Selected (multi):
//   - Background: rgba(51, 104, 160, 0.15)
//   - Border: #3368A0
//   - Text: #3368A0
//   - Checkmark icon on left (fade in, 150ms)
//
// Pressed:
//   - Scale: 0.95
//   - Haptic: light
```

**Implementation:**

```typescript
import React from 'react'
import { Pressable, Text, View } from 'react-native'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import { Ionicons } from '@expo/vector-icons'
import { haptics } from '../lib/haptics'

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

export function Chip({ selected, onPress, children, multiSelect = false }: ChipProps) {
  const scale = useSharedValue(1)

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  const handlePressIn = () => {
    scale.value = withSpring(0.95, { damping: 20, stiffness: 400 })
    haptics.light()
  }

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 150 })
  }

  const handlePress = () => {
    haptics.selection()
    onPress()
  }

  const getBackgroundColor = () => {
    if (!selected) return '#1A2028'
    return multiSelect ? 'rgba(51, 104, 160, 0.15)' : '#3368A0'
  }

  const getBorderColor = () => {
    if (!selected) return '#2A3441'
    return multiSelect ? '#3368A0' : 'transparent'
  }

  const getTextColor = () => {
    if (!selected) return '#8A9BA8'
    return multiSelect ? '#3368A0' : '#FFFFFF'
  }

  return (
    <AnimatedPressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      style={[
        animatedStyle,
        {
          backgroundColor: getBackgroundColor(),
          borderWidth: 1,
          borderColor: getBorderColor(),
          borderRadius: 20,
          height: 40,
          paddingHorizontal: 12,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
        },
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      {multiSelect && selected && (
        <Ionicons name="checkmark" size={16} color="#3368A0" />
      )}
      <Text
        style={{
          color: getTextColor(),
          fontSize: 15,
          fontWeight: '500',
        }}
      >
        {children}
      </Text>
    </AnimatedPressable>
  )
}
```

---

### 3.4 CARD SYSTEM

#### Profile Card (Discovery Deck)

```typescript
// components/ProfileCard.tsx
interface ProfileCardProps {
  profile: {
    id: string;
    name: string;
    age: number;
    wilaya: string;
    bio: string;
    photoUrl?: string;
    compatibility: 'great' | 'good' | null;
  };
  onPass: () => void;
  onRequest: () => void;
  onTap: () => void;
}

// Visual spec:
// Container:
//   - Background: #1A2028
//   - Border-radius: 24pt
//   - Overflow: hidden
//   - Shadow: 0 8pt 32pt rgba(0, 0, 0, 0.4)
//
// Photo area:
//   - Height: 384pt
//   - Background: linear-gradient(160deg, #252D38 0%, #1A2028 100%)
//   - Initial fallback: 120pt font, #3368A0, 30% opacity, centered
//
// Photo gradient overlay:
//   - position: absolute, bottom
//   - height: 50%
//   - background: linear-gradient(to top, #1A2028 0%, transparent 100%)
//
// Info section:
//   - Padding: 24pt
//   - Name: Inter-Bold, 28pt, #F2EFE7
//   - Meta: Inter-Regular, 15pt, #8A9BA8, margin-top 6pt
//   - Bio: Inter-Regular, 15pt, #F2EFE7, margin-top 12pt, line-height 22pt, max 4 lines
//
// Compatibility badge:
//   - Background: rgba(51, 104, 160, 0.15)
//   - Text: #66A3BF, Inter-SemiBold, 14pt
//   - Padding: 8pt 16pt
//   - Border-radius: 20pt
//   - Dot: 8pt circle, #3368A0, box-shadow 0 0 12pt rgba(51, 104, 160, 0.6)
//
// Swipe gestures:
//   - Pan responder on card
//   - Swipe right (Request): translateX + rotate 5deg, spring back if not enough
//   - Swipe left (Pass): translateX - rotate -5deg, spring back if not enough
//   - Threshold: 100pt horizontal
//   - On release past threshold: animate off-screen (300ms, easeOut), then callback
//   - Haptic: medium on threshold cross
```

**Implementation:**

```typescript
import React from 'react'
import { View, Text, Image, StyleSheet, Dimensions } from 'react-native'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated'
import { PanGestureHandler, PanGestureHandlerGestureEvent, TapGestureHandler } from 'react-native-gesture-handler'
import { haptics } from '../lib/haptics'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const SWIPE_THRESHOLD = 100

export function ProfileCard({ profile, onPass, onRequest, onTap }: ProfileCardProps) {
  const translateX = useSharedValue(0)
  const translateY = useSharedValue(0)
  const rotate = useSharedValue(0)
  const scale = useSharedValue(1)

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotate.value}deg` },
      { scale: scale.value },
    ],
  }))

  const handleGesture = (event: PanGestureHandlerGestureEvent) => {
    'worklet'
    translateX.value = event.translationX
    translateY.value = event.translationY * 0.3
    rotate.value = (event.translationX / SCREEN_WIDTH) * 10

    // Haptic on threshold cross
    if (Math.abs(event.translationX) > SWIPE_THRESHOLD && Math.abs(event.translationX - event.translationX + 1) < 2) {
      // Only trigger once per swipe
    }
  }

  const handleGestureEnd = (event: PanGestureHandlerGestureEvent) => {
    'worklet'
    const shouldSwipeRight = event.translationX > SWIPE_THRESHOLD
    const shouldSwipeLeft = event.translationX < -SWIPE_THRESHOLD

    if (shouldSwipeRight) {
      runOnJS(haptics.medium)()
      translateX.value = withTiming(SCREEN_WIDTH * 1.5, { duration: 300 })
      rotate.value = withTiming(15, { duration: 300 })
      runOnJS(onRequest)()
    } else if (shouldSwipeLeft) {
      runOnJS(haptics.medium)()
      translateX.value = withTiming(-SCREEN_WIDTH * 1.5, { duration: 300 })
      rotate.value = withTiming(-15, { duration: 300 })
      runOnJS(onPass)()
    } else {
      // Spring back
      translateX.value = withSpring(0, { damping: 15, stiffness: 150 })
      translateY.value = withSpring(0, { damping: 15, stiffness: 150 })
      rotate.value = withSpring(0, { damping: 15, stiffness: 150 })
    }
  }

  const handleTap = () => {
    runOnJS(onTap)()
  }

  const getCompatBadge = () => {
    if (profile.compatibility === 'great') {
      return { text: 'Great match', color: '#30A46C' }
    }
    if (profile.compatibility === 'good') {
      return { text: 'Good match', color: '#F5A524' }
    }
    return null
  }

  const badge = getCompatBadge()

  return (
    <TapGestureHandler onActivated={handleTap}>
      <PanGestureHandler onGestureEvent={handleGesture} onEnded={handleGestureEnd}>
        <Animated.View style={[styles.card, animatedStyle]}>
          {/* Photo */}
          <View style={styles.photoContainer}>
            {profile.photoUrl ? (
              <Image source={{ uri: profile.photoUrl }} style={styles.photo} />
            ) : (
              <View style={styles.photoFallback}>
                <Text style={styles.photoInitial}>{profile.name[0]}</Text>
              </View>
            )}
            <View style={styles.photoGradient} />
          </View>

          {/* Info */}
          <View style={styles.infoContainer}>
            <Text style={styles.name}>{profile.name}, {profile.age}</Text>
            <Text style={styles.meta}>{profile.wilaya}</Text>

            {badge && (
              <View style={[styles.badge, { borderColor: badge.color }]}>
                <View style={[styles.badgeDot, { backgroundColor: badge.color }]} />
                <Text style={[styles.badgeText, { color: badge.color }]}>
                  {badge.text}
                </Text>
              </View>
            )}

            <Text style={styles.bio} numberOfLines={4}>
              {profile.bio}
            </Text>
          </View>
        </Animated.View>
      </PanGestureHandler>
    </TapGestureHandler>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1A2028',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 32,
    elevation: 8,
  },
  photoContainer: {
    height: 384,
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  photoFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: 'linear-gradient(160deg, #252D38 0%, #1A2028 100%)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoInitial: {
    fontSize: 120,
    fontWeight: '700',
    color: '#3368A0',
    opacity: 0.3,
  },
  photoGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: 'linear-gradient(to top, #1A2028 0%, transparent 100%)',
  },
  infoContainer: {
    padding: 24,
  },
  name: {
    fontSize: 28,
    fontWeight: '700',
    color: '#F2EFE7',
  },
  meta: {
    fontSize: 15,
    color: '#8A9BA8',
    marginTop: 6,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(51, 104, 160, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginTop: 16,
  },
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  bio: {
    fontSize: 15,
    color: '#F2EFE7',
    lineHeight: 22,
    marginTop: 12,
  },
})
```

#### Photo Grid Tile (Onboarding)

```typescript
// components/PhotoTile.tsx
interface PhotoTileProps {
  state: 'empty' | 'loading' | 'success' | 'error' | 'moderation' | 'rejected';
  imageUrl?: string;
  isMain?: boolean;
  onPress: () => void;
  onSetMain?: () => void;
  onRemove?: () => void;
  onRetry?: () => void;
}

// States:
// 1. Empty (dashed border):
//    - Border: 2pt dashed #2A3441
//    - Border-radius: 12pt
//    - Plus icon: #8A9BA8, 24pt
//    - On press: border color → #3368A0, haptic light
//
// 2. Loading (spinner):
//    - Background: #252D38
//    - ActivityIndicator: #66A3BF
//
// 3. Success (photo):
//    - Image fills tile
//    - "Set main" overlay on press: rgba(0,0,0,0.5), text "Set main" white
//    - Trash icon top-right: #E5484D, 24pt circle background
//
// 4. Main photo badge:
//    - Position: absolute, top 8pt, left 8pt
//    - Background: #3368A0
//    - Text: "Main", Inter-SemiBold, 12pt, white
//    - Padding: 4pt 8pt
//    - Border-radius: 8pt
//
// 5. Under review:
//    - Semi-transparent overlay: rgba(0,0,0,0.6)
//    - Text: "Under review", Inter-Medium, 13pt, #F2EFE7
//
// 6. Rejected:
//    - Overlay: rgba(229, 72, 77, 0.15)
//    - Text: "Rejected — replace it", Inter-Medium, 13pt, #E5484D
//    - Retry button below
//
// 7. Failed upload:
//    - Overlay: rgba(229, 72, 77, 0.1)
//    - Text: "Upload failed", Inter-Medium, 13pt, #E5484D
//    - Retry + Remove buttons
```

---

### 3.5 SHEET/MODAL SYSTEM

#### Bottom Sheet

```typescript
// components/BottomSheet.tsx
interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

// Visual spec:
// Scrim:
//   - Background: rgba(15, 20, 25, 0.7)
//   - Backdrop blur: 10pt (expo-blur)
//   - Fade in: 250ms
//
// Sheet:
//   - Background: #1A2028
//   - Border-radius: 24pt top only
//   - Initial position: translateY(100%)
//   - Animate to: translateY(0)
//   - Spring: damping 25, stiffness 200
//   - Drag to dismiss: pan responder, threshold 100pt or velocity 500pt/s
//   - Haptic: medium on open
//
// Handle:
//   - Width: 36pt, height: 4pt
//   - Background: #2A3441
//   - Border-radius: 2pt
//   - Centered, margin-top 8pt
```

**Implementation:**

```typescript
import React, { useEffect } from 'react'
import { View, Text, StyleSheet, Modal as RNModal } from 'react-native'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated'
import { PanGestureHandler, PanGestureHandlerGestureEvent } from 'react-native-gesture-handler'
import { BlurView } from 'expo-blur'
import { haptics } from '../lib/haptics'

export function BottomSheet({ visible, onClose, children }: BottomSheetProps) {
  const translateY = useSharedValue(1000)
  const opacity = useSharedValue(0)

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, { damping: 25, stiffness: 200 })
      opacity.value = withTiming(1, { duration: 250 })
      haptics.medium()
    } else {
      translateY.value = withTiming(1000, { duration: 250 })
      opacity.value = withTiming(0, { duration: 250 })
    }
  }, [visible])

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }))

  const scrimStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }))

  const handleGesture = (event: PanGestureHandlerGestureEvent) => {
    'worklet'
    if (event.translationY > 0) {
      translateY.value = event.translationY
    }
  }

  const handleGestureEnd = (event: PanGestureHandlerGestureEvent) => {
    'worklet'
    const shouldDismiss = event.translationY > 100 || event.velocityY > 500

    if (shouldDismiss) {
      runOnJS(onClose)()
    } else {
      translateY.value = withSpring(0, { damping: 25, stiffness: 200 })
    }
  }

  if (!visible) return null

  return (
    <RNModal transparent visible={visible} animationType="none">
      <View style={styles.container}>
        <Animated.View style={[styles.scrim, scrimStyle]}>
          <BlurView intensity={10} style={StyleSheet.absoluteFill} />
        </Animated.View>

        <PanGestureHandler onGestureEvent={handleGesture} onEnded={handleGestureEnd}>
          <Animated.View style={[styles.sheet, animatedStyle]}>
            <View style={styles.handle} />
            {children}
          </Animated.View>
        </PanGestureHandler>
      </View>
    </RNModal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 20, 25, 0.7)',
  },
  sheet: {
    backgroundColor: '#1A2028',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 34,
    maxHeight: '80%',
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: '#2A3441',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
})
```

---

### 3.6 LIST SYSTEM

#### Request Row (Received)

```typescript
// components/RequestRow.tsx
interface RequestRowProps {
  profile: {
    id: string;
    name: string;
    wilaya: string;
    avatarUrl?: string;
  };
  onAccept: () => void;
  onDecline: () => void;
  acting?: boolean;
}

// Visual spec:
// Container:
//   - Background: #1A2028
//   - Border-radius: 16pt
//   - Padding: 16pt
//   - Margin-bottom: 12pt
//
// Layout: horizontal, align center
// Avatar: 52pt circle, gradient (#66A3BF → #3368A0), initial centered
// Info: flex 1, margin-left 16pt
//   Name: Inter-SemiBold, 17pt, #F2EFE7
//   Wilaya: Inter-Regular, 14pt, #8A9BA8, margin-top 4pt
// Buttons: Accept (primary, small) + Decline (ghost, small)
//   Height: 36pt, padding 12pt horizontal
//   Border-radius: 12pt
//
// Pressed state (row):
//   - Background: #252D38
//   - Haptic: light
//
// Acting state:
//   - Buttons show spinner
//   - Disable interaction
```

**Implementation:**

```typescript
import React from 'react'
import { View, Text, Image, Pressable, StyleSheet, ActivityIndicator } from 'react-native'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated'
import { haptics } from '../lib/haptics'

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

export function RequestRow({ profile, onAccept, onDecline, acting = false }: RequestRowProps) {
  const scale = useSharedValue(1)

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  const handlePressIn = () => {
    scale.value = withSpring(0.98, { damping: 20, stiffness: 400 })
    haptics.light()
  }

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 150 })
  }

  return (
    <AnimatedPressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.container, animatedStyle]}
      disabled={acting}
    >
      {/* Avatar */}
      <View style={styles.avatar}>
        {profile.avatarUrl ? (
          <Image source={{ uri: profile.avatarUrl }} style={styles.avatarImage} />
        ) : (
          <Text style={styles.avatarInitial}>{profile.name[0]}</Text>
        )}
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text style={styles.name}>{profile.name}</Text>
        <Text style={styles.wilaya}>{profile.wilaya}</Text>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <Pressable
          onPress={onAccept}
          disabled={acting}
          style={[styles.acceptButton, acting && styles.disabled]}
        >
          {acting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.acceptText}>Accept</Text>
          )}
        </Pressable>

        <Pressable
          onPress={onDecline}
          disabled={acting}
          style={[styles.declineButton, acting && styles.disabled]}
        >
          <Text style={styles.declineText}>Decline</Text>
        </Pressable>
      </View>
    </AnimatedPressable>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1A2028',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'linear-gradient(135deg, #66A3BF 0%, #3368A0 100%)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  avatarInitial: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  info: {
    flex: 1,
    marginLeft: 16,
  },
  name: {
    fontSize: 17,
    fontWeight: '600',
    color: '#F2EFE7',
  },
  wilaya: {
    fontSize: 14,
    color: '#8A9BA8',
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  acceptButton: {
    backgroundColor: '#3368A0',
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  declineButton: {
    backgroundColor: 'transparent',
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2A3441',
  },
  declineText: {
    color: '#8A9BA8',
    fontSize: 14,
    fontWeight: '500',
  },
  disabled: {
    opacity: 0.6,
  },
})
```

#### Message Row (Thread)

```typescript
// components/MessageRow.tsx
interface MessageRowProps {
  message: {
    id: string;
    text: string;
    isMine: boolean;
    timestamp: string;
    status: 'sent' | 'sending' | 'failed';
  };
  onRetry?: () => void;
}

// Visual spec:
// Mine (right-aligned):
//   - Background: #3368A0
//   - Text: white, Inter-Regular, 16pt
//   - Border-radius: 18pt, bottom-right 4pt
//   - Max-width: 75%
//   - Padding: 12pt 16pt
//   - Margin: 4pt 0
//
// Theirs (left-aligned):
//   - Background: #252D38
//   - Text: #F2EFE7
//   - Border-radius: 18pt, bottom-left 4pt
//
// Timestamp:
//   - Inter-Regular, 12pt, #8A9BA8
//   - Margin-top: 4pt
//
// Sending state:
//   - Opacity: 0.6
//   - "Sending…" below, Inter-Regular, 12pt, #8A9BA8
//
// Failed state:
//   - Red exclamation icon
//   - "Failed — retry", Inter-Medium, 13pt, #E5484D
//   - On tap: retry animation (rotate icon 360deg, 500ms)
```

---

### 3.7 NAVIGATION SYSTEM

#### Bottom Tab Bar

```typescript
// components/TabBar.tsx
// Visual spec:
// Container:
//   - Background: #0F1419 (solid, no blur for now)
//   - Border-top: 1pt solid #1A2028
//   - Height: 84pt (including safe area)
//   - Padding-bottom: safe-area-inset-bottom
//
// Tab item:
//   - Icon: 24pt, Ionicons
//   - Label: Inter-Medium, 11pt
//   - Color: #8A9BA8 (inactive), #3368A0 (active)
//   - Active indicator: dot above icon, 4pt, #3368A0
//
// Press feedback:
//   - Scale: 0.9 (spring)
//   - Haptic: light
```

**Implementation:**

```typescript
import React from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated'
import { haptics } from '../lib/haptics'

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

interface TabItemProps {
  icon: string
  label: string
  active: boolean
  onPress: () => void
}

function TabItem({ icon, label, active, onPress }: TabItemProps) {
  const scale = useSharedValue(1)

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  const handlePressIn = () => {
    scale.value = withSpring(0.9, { damping: 20, stiffness: 400 })
    haptics.light()
  }

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 150 })
  }

  const handlePress = () => {
    haptics.light()
    onPress()
  }

  return (
    <AnimatedPressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      style={[styles.tabItem, animatedStyle]}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
    >
      {active && <View style={styles.activeDot} />}
      <Ionicons
        name={icon as any}
        size={24}
        color={active ? '#3368A0' : '#8A9BA8'}
      />
      <Text
        style={[
          styles.tabLabel,
          { color: active ? '#3368A0' : '#8A9BA8' },
        ]}
      >
        {label}
      </Text>
    </AnimatedPressable>
  )
}

export function TabBar({ state, descriptors, navigation }) {
  return (
    <View style={styles.container}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key]
        const label = options.tabBarLabel ?? options.title ?? route.name
        const isFocused = state.index === index

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          })

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name)
          }
        }

        const iconMap = {
          Discover: 'compass',
          Requests: 'people',
          Messages: 'chatbubbles',
        }

        return (
          <TabItem
            key={route.key}
            icon={iconMap[route.name] || 'circle'}
            label={label}
            active={isFocused}
            onPress={onPress}
          />
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#0F1419',
    borderTopWidth: 1,
    borderTopColor: '#1A2028',
    paddingTop: 8,
    paddingBottom: 34, // Safe area
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#3368A0',
    marginBottom: 2,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
})
```

#### Screen Transitions (Expo Router)

```typescript
// app/_layout.tsx
import { Stack } from 'expo-router'

export default function Layout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right', // iOS push
        animationDuration: 400,
        gestureEnabled: true,
        gestureDirection: 'horizontal',
        contentStyle: {
          backgroundColor: '#0F1419',
        },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="auth" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="survey"
        options={{
          presentation: 'modal',
          animation: 'slide_from_bottom',
        }}
      />
      <Stack.Screen
        name="profile/[id]"
        options={{
          animation: 'slide_from_right',
        }}
      />
    </Stack>
  )
}
```

---

### 3.8 STATE COMPONENTS

#### Loading State

```typescript
// components/LoadingState.tsx
// Visual spec:
// Container: flex 1, center, padding 48pt
// Spinner: ActivityIndicator, #66A3BF, large
// Label: Inter-Medium, 15pt, #8A9BA8, margin-top 16pt

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#66A3BF" />
      <Text style={styles.label}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
  },
  label: {
    fontSize: 15,
    fontWeight: '500',
    color: '#8A9BA8',
    marginTop: 16,
  },
})
```

#### Empty State

```typescript
// components/EmptyState.tsx
// Visual spec:
// Container: flex 1, center, padding 48pt
// Icon: 48pt, #2A3441 (muted), centered
// Title: Inter-SemiBold, 20pt, #F2EFE7, margin-top 24pt
// Message: Inter-Regular, 15pt, #8A9BA8, margin-top 8pt, center, line-height 22pt
// Action: primary or ghost button, margin-top 32pt

export function EmptyState({
  icon,
  title,
  message,
  actionLabel,
  onAction,
}: {
  icon: string
  title: string
  message: string
  actionLabel?: string
  onAction?: () => void
}) {
  return (
    <View style={styles.container}>
      <Ionicons name={icon as any} size={48} color="#2A3441" />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {actionLabel && onAction && (
        <View style={styles.action}>
          <Button variant="primary" onPress={onAction}>
            {actionLabel}
          </Button>
        </View>
      )}
    </View>
  )
}
```

#### Error State

```typescript
// Same as Empty but:
// - Icon: alert-circle, #E5484D
// - Title: "Something went wrong"
// - Message: error description
// - Action: "Try again" button (retry callback)
```

#### Toast

```typescript
// components/Toast.tsx
// Visual spec:
// Container:
//   - Position: absolute, bottom 100pt, horizontal 24pt
//   - Background: #252D38
//   - Border-radius: 12pt
//   - Padding: 16pt
//   - Shadow: 0 8pt 32pt rgba(0, 0, 0, 0.4)
//   - Flex-direction: row, align center
//
// Message: Inter-Medium, 15pt, #F2EFE7, flex 1
// Close: X icon, #8A9BA8, 20pt
//
// Animation:
//   - Slide up from bottom + fade in, 300ms, spring
//   - Auto-dismiss: 4 seconds
//   - Slide down + fade out, 250ms, easeOut
//   - Haptic: light on show

export function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  const translateY = useSharedValue(100)
  const opacity = useSharedValue(0)

  useEffect(() => {
    translateY.value = withSpring(0, { damping: 20, stiffness: 200 })
    opacity.value = withTiming(1, { duration: 300 })
    haptics.light()

    const timer = setTimeout(() => {
      translateY.value = withTiming(100, { duration: 250 })
      opacity.value = withTiming(0, { duration: 250 })
      setTimeout(onClose, 250)
    }, 4000)

    return () => clearTimeout(timer)
  }, [])

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }))

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <Text style={styles.message}>{message}</Text>
      <Pressable onPress={onClose} hitSlop={8}>
        <Ionicons name="close" size={20} color="#8A9BA8" />
      </Pressable>
    </Animated.View>
  )
}
```

---

## 4. SCREEN-SPECIFIC MOTION

### 4.1 Auth Screens

```typescript
// Form reveal:
// - Fields stagger in from bottom: 50pt translateY, fade in
// - Delay: 100ms between each
// - Duration: 400ms, easeOut

// Button press:
// - Standard primary button motion

// Error shake:
// - On validation error: shake form (translateX -10pt, 10pt, -5pt, 5pt, 0)
// - Duration: 400ms
// - Haptic: error
```

**Implementation:**

```typescript
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
  withDelay,
} from 'react-native-reanimated';

// Stagger animation for form fields
const staggerDelay = 100;

formFields.forEach((field, index) => {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(50);

  useEffect(() => {
    opacity.value = withDelay(index * staggerDelay, withTiming(1, { duration: 400 }));
    translateY.value = withDelay(index * staggerDelay, withTiming(0, { duration: 400 }));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));
});

// Error shake
const shake = () => {
  translateX.value = withSequence(
    withTiming(-10, { duration: 50 }),
    withTiming(10, { duration: 50 }),
    withTiming(-5, { duration: 50 }),
    withTiming(5, { duration: 50 }),
    withTiming(0, { duration: 50 }),
  );
  haptics.error();
};
```

### 4.2 Onboarding Wizard

```typescript
// Step transition:
// - Slide horizontal: new step from right, old step to left
// - 400ms, screenTransition curve
// - Progress bar animates width, 300ms, easeOut

// Photo grid:
// - Tiles stagger in: scale 0.8 → 1, fade in
// - Delay: 50ms between each
// - Duration: 300ms, spring
```

### 4.3 Discovery Deck

```typescript
// Card stack:
// - Top card: full size, z-index 2
// - Second card: scale 0.95, translateY 20pt, z-index 1
// - Third card: scale 0.9, translateY 40pt, z-index 0

// Swipe:
// - Pan responder on top card
// - TranslateX and rotate follow finger
// - Shadow intensifies as card moves
// - Opacity of next card increases

// Release:
// - If past threshold: animate off-screen, callback
// - If not: spring back to center
// - Next card scales up to full size, 300ms

// Button press (Pass/Request):
// - Scale 0.9 on press, spring back
// - Haptic: medium
// - Card animates off-screen in corresponding direction
```

**Implementation:**

```typescript
// Card stack animation
const nextCardStyle = useAnimatedStyle(() => ({
  transform: [
    { scale: interpolate(translateX.value, [-SCREEN_WIDTH, 0, SCREEN_WIDTH], [0.95, 0.95, 1]) },
    { translateY: interpolate(translateX.value, [-SCREEN_WIDTH, 0, SCREEN_WIDTH], [20, 20, 0]) },
  ],
  opacity: interpolate(translateX.value, [-SCREEN_WIDTH, 0, SCREEN_WIDTH], [0.5, 0.5, 1]),
}));
```

### 4.4 Messages Thread

```typescript
// Message send:
// - Optimistic UI: message appears immediately
// - Scale 0.9 → 1, fade in, 200ms
// - If failed: shake + error state

// Keyboard:
// - Input bar moves with keyboard, 250ms, easeOut
// - Message list scrolls to bottom on keyboard open

// New message received:
// - If from other: slide in from left, 300ms
// - If app in foreground: haptic light
```

---

## 5. ACCESSIBILITY REQUIREMENTS

### Non-Negotiable

```typescript
// Every interactive element:
// - min-height: 44pt
// - accessibilityRole: button/link/input/etc
// - accessibilityLabel: descriptive
// - accessibilityHint: what happens on press

// Focus states:
// - Border: 2pt solid #66A3BF
// - Box-shadow: 0 0 0 4pt rgba(102, 163, 191, 0.2)

// Screen reader:
// - All images: accessibilityLabel
// - All icons: accessibilityLabel
// - Form errors: accessibilityLiveRegion="polite"

// Reduce motion:
// - Respect AccessibilityInfo.isReduceMotionEnabled()
// - Replace springs with fades
// - Disable parallax and scale effects
```

**Implementation:**

```typescript
import { AccessibilityInfo } from 'react-native';

const [reduceMotionEnabled, setReduceMotionEnabled] = useState(false);

useEffect(() => {
  AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotionEnabled);
  const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotionEnabled);
  return () => subscription.remove();
}, []);

// Use reduceMotionEnabled to conditionally disable animations
const animationConfig = reduceMotionEnabled
  ? { duration: 0 } // No animation
  : { damping: 15, stiffness: 150 };
```

---

## 6. PERFORMANCE REQUIREMENTS

### Lists

```typescript
// Use FlatList or FlashList (not ScrollView)
// keyExtractor: stable, unique
// removeClippedSubviews: true
// maxToRenderPerBatch: 10
// windowSize: 10

<FlatList
  data={data}
  keyExtractor={(item) => item.id}
  removeClippedSubviews={true}
  maxToRenderPerBatch={10}
  windowSize={10}
  initialNumToRender={10}
  updateCellsBatchingPeriod={50}
/>
```

### Images

```typescript
// expo-image with cache policy
// Priority: high for visible, low for off-screen
// Fade in on load, 300ms

import { Image } from 'expo-image'

<Image
  source={{ uri: imageUrl }}
  style={styles.image}
  contentFit="cover"
  transition={300}
  cachePolicy="memory-disk"
  priority="high"
/>
```

### Re-renders

```typescript
// React.memo on all list rows
// useCallback for all handlers
// useMemo for expensive computations

export const RequestRow = React.memo(
  ({ profile, onAccept, onDecline }) => {
    // Component implementation
  },
  (prevProps, nextProps) => {
    // Custom comparison if needed
    return prevProps.profile.id === nextProps.profile.id && prevProps.acting === nextProps.acting;
  },
);

// In parent:
const handleAccept = useCallback((id: string) => {
  // Accept logic
}, []);

const handleDecline = useCallback((id: string) => {
  // Decline logic
}, []);
```

### Animations

```typescript
// Use Reanimated 3 (not Animated API)
// Run on UI thread (useAnimatedStyle, useSharedValue)
// Avoid layout animations on complex screens

import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

// ✅ Good: Runs on UI thread
const animatedStyle = useAnimatedStyle(() => ({
  transform: [{ scale: scale.value }],
}));

// ❌ Bad: Runs on JS thread
const [scale, setScale] = useState(1);
Animated.timing(animatedValue, { toValue: 1 }).start();
```

---

## 7. DELIVERABLES CHECKLIST

For every component and screen, deliver:

- [ ] Complete implementation code
- [ ] All animation specs (curves, durations, haptics)
- [ ] All state variations (loading, empty, error, success)
- [ ] Accessibility props
- [ ] Performance optimizations
- [ ] TypeScript types
- [ ] Jest tests (minimum 80% coverage)

---

## APPENDIX: QUICK REFERENCE

### Color Usage

| Element       | Color                               |
| ------------- | ----------------------------------- |
| Primary CTA   | `#3368A0`                           |
| Secondary CTA | `#66A3BF` (outlined) or transparent |
| Destructive   | `#E5484D`                           |
| Success       | `#30A46C`                           |
| Warning       | `#F5A524`                           |
| Background    | `#0F1419`                           |
| Card          | `#1A2028`                           |
| Elevated      | `#252D38`                           |
| Text          | `#F2EFE7`                           |
| Muted         | `#8A9BA8`                           |
| Border        | `#2A3441`                           |

### Spacing Scale

| Token | Value |
| ----- | ----- |
| xs    | 4pt   |
| sm    | 8pt   |
| md    | 16pt  |
| lg    | 24pt  |
| xl    | 32pt  |
| xxl   | 48pt  |

### Radius Scale

| Token | Value  |
| ----- | ------ |
| sm    | 8pt    |
| md    | 12pt   |
| lg    | 16pt   |
| xl    | 24pt   |
| full  | 9999pt |

### Motion Durations

| Token   | Value | Use Case           |
| ------- | ----- | ------------------ |
| instant | 0ms   | State changes      |
| fast    | 150ms | Button presses     |
| normal  | 250ms | Sheet opens        |
| slow    | 400ms | Screen transitions |
| slower  | 600ms | Splash, hero       |

### Haptic Mapping

| Interaction         | Haptic    |
| ------------------- | --------- |
| Button press        | light     |
| Tab switch          | light     |
| Chip select         | selection |
| Swipe threshold     | medium    |
| Success action      | success   |
| Error               | error     |
| Destructive confirm | heavy     |

---

**END OF SPECIFICATION**

This is not a guideline. This is a specification. Follow it exactly.
