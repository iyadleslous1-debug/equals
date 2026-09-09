import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { CodeInput } from '@/features/auth/components/CodeInput';
import { useConfirmCode, usePendingEmail, useResendCode } from '@/features/auth/hooks';

export default function ConfirmScreen(): React.JSX.Element {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string | string[] }>();
  const rawParam = Array.isArray(params.email) ? params.email[0] : params.email;
  // Normalize exactly like signup storage: empty-after-trim means "no email".
  const normalizedParam = rawParam?.trim().toLowerCase() ?? '';
  const hasParam = normalizedParam !== '';
  const { email: stored } = usePendingEmail(!hasParam);
  const { confirm, status, error } = useConfirmCode();
  const { resend, label, canResend, error: resendError } = useResendCode();

  useEffect(() => {
    if (status === 'success') router.replace('/');
  }, [status, router]);

  if (!hasParam && stored === undefined) return <LoadingState label="Loading…" />;
  const email = hasParam ? normalizedParam : stored;
  if (email === null || email === undefined || email === '') {
    return (
      <View className="flex-1 bg-void">
        <ErrorState
          message="No email awaiting confirmation."
          onRetry={() => router.replace('/signup')}
          retryTitle="Create an account"
          testID="confirm-missing"
        />
      </View>
    );
  }

  const verifying = status === 'pending';
  return (
    <ScrollView className="bg-void">
      <View className="grow justify-center px-4 py-8">
        <Text className="text-2xl font-bold text-text">Check your email</Text>
        <Text className="mt-2 text-sm text-muted">Enter the 6-digit code sent to {email}.</Text>
        <View className="mt-6">
          <CodeInput
            onComplete={(code) => confirm(email, code)}
            editable={!verifying}
            testID="confirm-code"
          />
        </View>
        {verifying ? (
          <Text testID="confirm-verifying" className="mt-4 text-center text-sm text-muted">
            Verifying…
          </Text>
        ) : null}
        {error ? (
          <Text
            testID="confirm-error"
            accessibilityRole="alert"
            className="mt-4 text-center text-sm text-destructive"
          >
            {error.message}
          </Text>
        ) : null}
        <View className="mt-6">
          <Button
            title={label}
            onPress={() => resend(email)}
            disabled={!canResend || verifying}
            variant="ghost"
            testID="confirm-resend"
          />
        </View>
        {resendError ? (
          <Text
            testID="confirm-resend-error"
            accessibilityRole="alert"
            className="mt-2 text-center text-sm text-destructive"
          >
            {resendError.message}
          </Text>
        ) : null}
      </View>
    </ScrollView>
  );
}
