import { router } from 'expo-router';
import { ArrowRight } from 'lucide-react-native';
import { View } from 'react-native';

import { useActions } from '@/application/store';
import { Wordmark } from '@/components/brand';
import { Button } from '@/components/ui/button';
import { FadeIn, Screen } from '@/components/ui/layout';
import { Text } from '@/components/ui/text';
import { supabase } from '@/infrastructure/supabase';
import { space } from '@/theme/tokens';

export default function Welcome() {
  const actions = useActions();
  return (
    <Screen contentStyle={{ flexGrow: 1, justifyContent: 'space-between' }}>
      <FadeIn>
        <Wordmark size={22} />
      </FadeIn>

      <View style={{ gap: space.lg }}>
        <FadeIn index={1}>
          <Text variant="display" style={{ fontSize: 52, lineHeight: 54 }}>
            Less scrolling.{'\n'}More living.
          </Text>
        </FadeIn>
        <FadeIn index={2}>
          <Text tone="muted" style={{ fontSize: 18, lineHeight: 27 }}>
            STILL doesn't block your apps. When you notice you're scrolling without meaning to, it gives you something
            better to do with those minutes, and helps you keep doing it.
          </Text>
        </FadeIn>
      </View>

      <FadeIn index={3} style={{ gap: space.sm }}>
        <Button label="Get started" icon={ArrowRight} onPress={() => router.push('/onboarding')} />
        <Button variant="secondary" label="Continue as guest" onPress={() => actions.updatePreferences({ onboarded: true })} />
        {supabase ? (
          <Button variant="quiet" label="I already have an account" onPress={() => router.push('/auth')} />
        ) : (
          <Text variant="small" tone="faint" style={{ textAlign: 'center', marginTop: space.sm }}>
            Everything stays on this phone. No account needed.
          </Text>
        )}
      </FadeIn>
    </Screen>
  );
}
