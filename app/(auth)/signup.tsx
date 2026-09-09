import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
  type TextInput as RNTextInput,
} from 'react-native';
import { Button } from '@/components/Button';
import { FormErrorSummary, type FieldError } from '@/components/FormErrorSummary';
import { Input } from '@/components/Input';
import { Reveal } from '@/components/Reveal';
import { isAlreadyRegistered } from '@/features/auth/authErrors';
import { useSignUp } from '@/features/auth/hooks';
import { normalizeEmail, validatePassword } from '@/lib/auth';

export default function SignupScreen(): React.JSX.Element {
  const router = useRouter();
  const { signUp, status, error, needsConfirmation } = useSignUp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fields, setFields] = useState<{ email?: string; password?: string }>({});
  const [submittedEmail, setSubmittedEmail] = useState('');
  const emailRef = useRef<RNTextInput>(null);
  const passwordRef = useRef<RNTextInput>(null);

  const submit = (): void => {
    const cleanEmail = normalizeEmail(email);
    const cleanPassword = validatePassword(password);
    setFields({
      email: cleanEmail.ok ? undefined : cleanEmail.error.message,
      password: cleanPassword.ok ? undefined : cleanPassword.error.message,
    });
    if (!cleanEmail.ok || !cleanPassword.ok) return;
    setSubmittedEmail(cleanEmail.data);
    signUp(cleanEmail.data, cleanPassword.data);
  };

  useEffect(() => {
    if (status !== 'success') return;
    if (needsConfirmation) {
      router.replace({ pathname: '/confirm', params: { email: submittedEmail } });
    } else {
      router.replace('/');
    }
  }, [status, needsConfirmation, router, submittedEmail]);

  const summary: FieldError[] = [
    ...(fields.email ? [{ field: 'email', message: fields.email }] : []),
    ...(fields.password ? [{ field: 'password', message: fields.password }] : []),
  ];
  const focusField = (field: string): void => {
    if (field === 'email') emailRef.current?.focus();
    else passwordRef.current?.focus();
  };
  const registered = error !== null && isAlreadyRegistered(error);

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 bg-void">
      <ScrollView>
        <View className="grow justify-center px-4 py-8">
          <Text className="text-2xl font-bold text-text">Create an account</Text>
          <Text className="mt-2 text-sm text-muted">Meet people for friendship or romance in a minute.</Text>
          <View className="mt-6 gap-4">
            {summary.length > 0 ? (
              <FormErrorSummary errors={summary} onSelect={focusField} testID="signup-errors" />
            ) : null}
            <Reveal index={0}>
              <Input
                ref={emailRef}
                label="Email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                textContentType="emailAddress"
                error={fields.email}
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
                testID="signup-email"
              />
            </Reveal>
            <Reveal index={1}>
              <Input
                ref={passwordRef}
                label="Password"
                hint="8 characters minimum"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="password"
                textContentType="newPassword"
                error={fields.password}
                returnKeyType="done"
                onSubmitEditing={submit}
                testID="signup-password"
              />
            </Reveal>
            {error && !registered ? (
              <Text
                testID="signup-server-error"
                accessibilityRole="alert"
                className="text-sm text-destructive"
              >
                {error.message}
              </Text>
            ) : null}
            {registered && error ? (
              <View className="rounded-xl border border-border bg-ink p-4">
                <Text className="text-sm text-text">{error.message}</Text>
                <Pressable
                  testID="signup-signin-link"
                  onPress={() => router.replace('/login')}
                  accessibilityRole="link"
                  accessibilityLabel="Log in"
                >
                  <Text className="mt-2 text-sm font-bold text-secondary">Log in</Text>
                </Pressable>
              </View>
            ) : null}
            <Button
              title="Create my account"
              onPress={submit}
              loading={status === 'pending'}
              testID="signup-submit"
            />
            <Pressable
              onPress={() => router.replace('/login')}
              accessibilityRole="link"
              accessibilityLabel="Log in"
            >
              <Text className="text-center text-sm text-muted">
                Already have an account? <Text className="font-bold text-secondary">Log in</Text>
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
