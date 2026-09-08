import { memo } from 'react';
import { Text, View } from 'react-native';
import { Avatar } from '@/components/Avatar';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { wilayaLabel } from '@/constants/wilayas';

export interface RequestCounterpart {
  display_name: string;
  age: number | null;
  wilaya: number | null;
  avatarUri?: string | null;
}

export interface RequestItem {
  id: string;
  status: string;
  created_at: string;
  profile: RequestCounterpart | null;
}

export interface RequestCardProps {
  request: RequestItem;
  direction: 'received' | 'sent';
  acting: boolean;
  onAccept?: () => void;
  onDecline?: () => void;
  testID?: string;
}

const STATUS_CHIP = {
  pending: { label: 'En attente', variant: 'warning' },
  accepted: { label: 'Acceptée', variant: 'success' },
  declined: { label: 'Refusée', variant: 'destructive' },
  canceled: { label: 'Annulée', variant: 'destructive' },
} as const;

/** Memoized: inbox re-renders on acting/notice churn; idle rows skip. */
export const RequestCard = memo(function RequestCard({
  request,
  direction,
  acting,
  onAccept,
  onDecline,
  testID,
}: RequestCardProps) {
  const t = (id: string): string => (testID ? `${testID}-${id}` : '');
  const name =
    request.profile && request.profile.age !== null
      ? `${request.profile.display_name}, ${request.profile.age}`
      : (request.profile?.display_name ?? 'Utilisateur indisponible');
  const chip = STATUS_CHIP[request.status as keyof typeof STATUS_CHIP] ?? STATUS_CHIP.pending;
  return (
    <View testID={testID} className="flex-row items-center rounded-2xl border border-border bg-ink p-3">
      <Avatar
        name={request.profile?.display_name ?? '?'}
        uri={request.profile?.avatarUri ?? undefined}
        size={48}
      />
      <View className="ml-3 flex-1">
        <Text className="text-base font-bold text-text" numberOfLines={1}>
          {name}
        </Text>
        {request.profile?.wilaya !== null && request.profile?.wilaya !== undefined ? (
          <Text className="text-xs text-muted">{wilayaLabel(request.profile.wilaya)}</Text>
        ) : null}
        {direction === 'sent' ? (
          <View className="mt-1 self-start">
            <Badge label={chip.label} variant={chip.variant} />
          </View>
        ) : null}
      </View>
      {direction === 'received' && request.status === 'pending' ? (
        <View className="gap-2">
          <Button title="Accepter" onPress={() => onAccept?.()} disabled={acting} testID={t('accept')} />
          <Button
            title="Refuser"
            onPress={() => onDecline?.()}
            disabled={acting}
            variant="ghost"
            testID={t('decline')}
          />
        </View>
      ) : null}
    </View>
  );
});
