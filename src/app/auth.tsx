import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { useActions } from '@/application/store';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/controls';
import { Screen } from '@/components/ui/layout';
import { Text } from '@/components/ui/text';
import { supabase } from '@/infrastructure/supabase';
import { space } from '@/theme/tokens';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Auth() {
  const actions = useActions();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!supabase) {
    return (
      <Screen>
        <Text variant="title">Accounts are off in this build</Text>
        <Text tone="muted">Everything works on this phone without an account. Your data stays here.</Text>
        <Button variant="secondary" label="Close" onPress={() => router.back()} />
      </Screen>
    );
  }

  async function submit() {
    if (!EMAIL.test(email.trim())) return setMessage('Enter a valid email address.');
    if (password.length < 8) return setMessage('Use at least 8 characters for your password.');
    setBusy(true);
    setMessage(null);
    const error = mode === 'signin' ? await actions.signIn(email, password) : await actions.signUp(email, password);
    setBusy(false);
    if (error) setMessage(error);
    else router.back();
  }

  return (
    <Screen>
      <View style={{ gap: space.sm }}>
        <Text variant="title">{mode === 'signin' ? 'Welcome back' : 'Create an account'}</Text>
        <Text tone="muted">
          An account backs up your progress and lets you add friends. Anything you did as a guest comes with you.
        </Text>
      </View>
      <Field
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
      />
      <Field
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
        textContentType={mode === 'signin' ? 'password' : 'newPassword'}
        hint={mode === 'signup' ? 'At least 8 characters.' : undefined}
      />
      {message ? (
        <Text tone="danger" accessibilityLiveRegion="polite">
          {message}
        </Text>
      ) : null}
      <View style={{ gap: space.sm }}>
        <Button label={mode === 'signin' ? 'Sign in' : 'Create account'} loading={busy} onPress={submit} />
        <Button
          variant="quiet"
          label={mode === 'signin' ? 'New here? Create an account' : 'Have an account? Sign in'}
          onPress={() => {
            setMode(mode === 'signin' ? 'signup' : 'signin');
            setMessage(null);
          }}
        />
        <Button variant="quiet" label="Not now" onPress={() => router.back()} />
      </View>
    </Screen>
  );
}
