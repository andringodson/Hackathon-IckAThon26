import { Download, Trash, X } from 'lucide-react-native';
import { useEffect } from 'react';
import { View } from 'react-native';

import { cancelDownload, deleteModel, refreshModels, startDownload, useAiModels } from '@/application/ai-model';
import { useActions, useStore } from '@/application/store';
import { Button } from '@/components/ui/button';
import { ChipGroup, ToggleRow } from '@/components/ui/controls';
import { Card, Meter, SectionLabel } from '@/components/ui/layout';
import { Text } from '@/components/ui/text';
import { localAiSupported, MODELS } from '@/infrastructure/local-llm';
import { space } from '@/theme/tokens';

const MODEL_OPTIONS = (['best', 'light'] as const).map((value) => ({ value, label: MODELS[value].detail }));

/** Set up and control the on-device AI coach. Where it can't run (web), explains where it does. */
export function AiCoachCard() {
  const { snapshot } = useStore();
  const actions = useActions();
  const ai = useAiModels();
  const p = snapshot.preferences;
  const ready = ai.ready[p.aiModel];
  const downloading = ai.downloading === p.aiModel;

  useEffect(() => {
    void refreshModels();
  }, []);

  if (!localAiSupported) {
    return (
      <Card>
        <SectionLabel>AI coach · on your phone</SectionLabel>
        <Text tone="muted">
          In the Android app, an open-source model (Qwen3.5) personalises these suggestions right on your phone. Free,
          offline and private. Here you see the instant on-device matches.
        </Text>
      </Card>
    );
  }

  return (
    <Card>
      <SectionLabel>AI coach · on your phone</SectionLabel>
      <Text tone="muted">
        An open-source model ({MODELS[p.aiModel].label}) writes your suggestions right on this phone. Free, works offline,
        and your answers never leave the device.
      </Text>
      <ChipGroup
        options={MODEL_OPTIONS}
        value={p.aiModel}
        onChange={(aiModel) => !ai.downloading && actions.updatePreferences({ aiModel })}
      />
      {ready ? (
        <View style={{ gap: space.sm }}>
          <ToggleRow
            label="Use the AI coach"
            detail="Suggestions appear instantly, then the AI personalises them."
            value={p.aiConsent}
            onChange={(aiConsent) => actions.updatePreferences({ aiConsent })}
          />
          <Button variant="quiet" label="Remove the model to free space" icon={Trash} onPress={() => void deleteModel(p.aiModel)} />
        </View>
      ) : downloading ? (
        <View style={{ gap: space.sm }} accessibilityLiveRegion="polite">
          <Meter value={ai.progress} label="Model download" />
          <Text variant="small" tone="muted" style={{ fontVariant: ['tabular-nums'] }}>
            Downloading… {Math.round(ai.progress * 100)}%. You can keep using STILL.
          </Text>
          <Button variant="quiet" label="Cancel download" icon={X} onPress={cancelDownload} />
        </View>
      ) : (
        <View style={{ gap: space.sm }}>
          <Button
            variant="secondary"
            label="Download the AI coach"
            icon={Download}
            disabled={!!ai.downloading}
            onPress={() => {
              actions.updatePreferences({ aiConsent: true });
              void startDownload(p.aiModel);
            }}
          />
          <Text variant="small" tone="faint">
            One-time download. Wi-Fi recommended.
          </Text>
          {ai.error ? (
            <Text variant="small" tone="danger">
              {ai.error}. Check your connection and try again.
            </Text>
          ) : null}
        </View>
      )}
    </Card>
  );
}
