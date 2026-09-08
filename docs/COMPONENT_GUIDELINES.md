# Component Guidelines — DZ Connect

Extends `components/README.md` (dumb by default, one file per component,
explicit props, promote-after-second-reuse, NativeWind classes).

## Anatomy of a component

```tsx
interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
  loading?: boolean;
  disabled?: boolean;
  testID?: string;
}
```

- Props interface is explicit and exported. `testID` on every interactive
  element (Expo Go verification + future E2E).
- Visual states derive from props only — no internal fetch, no navigation.
- Tokens only: `bg-primary text-onPrimary rounded-xl` (12 via theme), never hex.

## The inventories

**Primitives** (`components/`): Button, IconButton (hitSlop built in), Input,
Skeleton, LoadingState, EmptyState, ErrorState, Toast (+ host), Modal, Sheet,
Avatar, Badge, Chip, FormErrorSummary.
**Feature** (`features/<n>/components/`): UserCard, ProfileHeader, PhotoGrid,
RequestCard, MessageBubble, ChatInput.

## Rules with teeth

1. No new component when extension fits — reviewer rejects duplicates.
2. New primitive ships with: props interface, all states from the MASTER
   states-matrix, a11y props (role, label, state announcements), co-located
   `*.test.tsx` when it carries logic.
3. Icons: Ionicons via `@expo/vector-icons`, 20/24/32 tokens, decorative icons
   hidden from the accessibility tree.
4. No `StyleSheet` except measured layout or iOS shadows (from `ELEVATION`).
