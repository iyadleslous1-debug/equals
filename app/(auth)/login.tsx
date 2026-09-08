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
import { signInNextStep } from '@/features/auth/authErrors';
import { useLogin } from '@/features/auth/hooks';
import { normalizeEmail } from '@/lib/auth';

export default function LoginScreen(): React.JSX.Element {
  const router = useRouter();
  const { logIn, reset, status, error } = useLogin();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fields, setFields] = useState<{ email?: string; password?: string }>({});
  const [submittedEmail, setSubmittedEmail] = useState('');
  const emailRef = useRef<RNTextInput>(null);
  const passwordRef = useRef<RNTextInput>(null);

  const onEmailChange = (value: string): void => {
    setEmail(value);
    // Stale server errors (and the confirm CTA) must not survive new input.
    reset();
    setSubmittedEmail('');
    setFields((prev) => ({ ...prev, email: undefined }));
  };

  const submit = (): void => {
    const cleanEmail = normalizeEmail(email);
    const passwordError = password === '' ? 'Entrez votre mot de passe.' : undefined;
    setFields({
      email: cleanEmail.ok ? undefined : cleanEmail.error.message,
      password: passwordError,
    });
    if (!cleanEmail.ok || passwordError !== undefined) return;
    setSubmittedEmail(cleanEmail.data);
    logIn(cleanEmail.data, password);
  };

  useEffect(() => {
    if (status === 'success') router.replace('/');
  }, [status, router]);

  const summary: FieldError[] = [
    ...(fields.email ? [{ field: 'email', message: fields.email }] : []),
    ...(fields.password ? [{ field: 'password', message: fields.password }] : []),
  ];
  const focusField = (field: string): void => {
    if (field === 'email') emailRef.current?.focus();
    else passwordRef.current?.focus();
  };
  const next = error !== null ? signInNextStep(error, submittedEmail) : null;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 bg-void">
      <ScrollView>
        <View className="grow justify-center px-4 py-8">
          <Text className="text-2xl font-bold text-text">Se connecter</Text>
          <Text className="mt-2 text-sm text-muted">Bon retour parmi nous.</Text>
          <View className="mt-6 gap-4">
            {summary.length > 0 ? (
              <FormErrorSummary errors={summary} onSelect={focusField} testID="login-errors" />
            ) : null}
            <Input
              ref={emailRef}
              label="Email"
              value={email}
              onChangeText={onEmailChange}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
              error={fields.email}
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              testID="login-email"
            />
            <Input
              ref={passwordRef}
              label="Mot de passe"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
              textContentType="password"
              error={fields.password}
              returnKeyType="done"
              onSubmitEditing={submit}
              testID="login-password"
            />
            {next !== null && next.kind !== 'confirm' ? (
              <Text testID="login-error" className="text-sm text-destructive">
                {next.message}
              </Text>
            ) : null}
            {next !== null && next.kind === 'confirm' ? (
              <View className="rounded-xl border border-border bg-ink p-4">
                <Text className="text-sm text-text">Confirmez votre email pour continuer.</Text>
                <Pressable
                  testID="login-confirm-action"
                  onPress={() => router.replace({ pathname: '/confirm', params: { email: next.email } })}
                >
                  <Text className="mt-2 text-sm font-bold text-secondary">Entrer le code</Text>
                </Pressable>
              </View>
            ) : null}
            <Button
              title="Se connecter"
              onPress={submit}
              loading={status === 'pending'}
              testID="login-submit"
            />
            <Pressable onPress={() => router.replace('/signup')}>
              <Text className="text-center text-sm text-muted">
                Pas de compte ? <Text className="font-bold text-secondary">Créer un compte</Text>
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
