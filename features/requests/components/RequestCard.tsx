import { memo } from 'react';
import { Text, View } from 'react-native';
import { Avatar } from '@/components/Avatar';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { COLORS } from '@/constants/theme';
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
  pending: { label: 'Pending', variant: 'warning' },
  accepted: { label: 'Accepted', variant: 'success' },
  declined: { label: 'Declined', variant: 'destructive' },
  canceled: { label: 'Canceled', variant: 'destructive' },
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
      : (request.profile?.display_name ?? 'User unavailable');
  const chip = STATUS_CHIP[request.status as keyof typeof STATUS_CHIP] ?? STATUS_CHIP.pending;
  return (
    <View
      testID={testID}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 16,
        backgroundColor: COLORS.ink,
        padding: 16,
        marginBottom: 12,
      }}
    >
      <Avatar
        name={request.profile?.display_name ?? '?'}
        uri={request.profile?.avatarUri ?? undefined}
        size={52}
      />
      <View style={{ marginLeft: 16, flex: 1 }}>
        <Text style={{ fontSize: 17, fontWeight: '600', color: COLORS.text }} numberOfLines={1}>
          {name}
        </Text>
        {request.profile?.wilaya !== null && request.profile?.wilaya !== undefined ? (
          <Text style={{ marginTop: 4, fontSize: 14, color: COLORS.muted }}>
            {wilayaLabel(request.profile.wilaya)}
          </Text>
        ) : null}
        {direction === 'sent' ? (
          <View className="mt-1 self-start">
            <Badge label={chip.label} variant={chip.variant} />
          </View>
        ) : null}
      </View>
      {direction === 'received' && request.status === 'pending' ? (
        <View className="gap-2">
          <Button
            title="Accept"
            onPress={() => onAccept?.()}
            disabled={acting}
            size="small"
            testID={t('accept')}
          />
          <Button
            title="Decline"
            onPress={() => onDecline?.()}
            disabled={acting}
            variant="ghost"
            size="small"
            testID={t('decline')}
          />
        </View>
      ) : null}
    </View>
  );
});
