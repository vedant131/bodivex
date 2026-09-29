import React, { useState } from 'react';
import { View, Text } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '../../../stores/authStore';
import { OnboardingShell } from '../../../components/ui/OnboardingShell';
import { Field, Input } from '../../../components/ui/Form';
import { Glass } from '../../../components/ui/Glass';
import { T, type } from '../../../constants/theme';
import { CONFIG } from '../../../constants/config';

export default function TrainerStep3() {
  const { trainerProfile, setTrainerProfile } = useAuthStore();
  const pref = trainerProfile?.sessionPreference ?? 'both';
  const online = pref !== 'offline';
  const inPerson = pref !== 'online';

  const [onlinePrice, setOnlinePrice] = useState(trainerProfile?.pricingOnline?.toString() ?? '');
  const [offlinePrice, setOfflinePrice] = useState(trainerProfile?.pricingOffline?.toString() ?? '');

  // Only ask for the prices that apply (an online-only coach must not look bookable in person)
  const valid = (!online || Number(onlinePrice) > 0) && (!inPerson || Number(offlinePrice) > 0);

  const next = () => {
    setTrainerProfile({
      ...trainerProfile!,
      pricingOnline: online ? Number(onlinePrice) : undefined,
      pricingOffline: inPerson ? Number(offlinePrice) : undefined,
    });
    router.push('/onboarding/trainer/step4');
  };

  return (
    <OnboardingShell preset="trainer" step={3} total={5} title="Your prices" subtitle="Per 60-minute session. Clients pay you directly." cta="Next" onNext={next} canNext={valid}>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        {online && (
          <View style={{ flex: 1 }}>
            <Field label="Online ₹">
              <Input value={onlinePrice} onChangeText={(v) => setOnlinePrice(v.replace(/\D/g, ''))} placeholder="499" keyboardType="number-pad" maxLength={5} />
            </Field>
          </View>
        )}
        {inPerson && (
          <View style={{ flex: 1 }}>
            <Field label="In person ₹">
              <Input value={offlinePrice} onChangeText={(v) => setOfflinePrice(v.replace(/\D/g, ''))} placeholder="799" keyboardType="number-pad" maxLength={5} />
            </Field>
          </View>
        )}
      </View>

      <Glass radius={T.radius.lg} style={{ padding: 16, gap: 6 }}>
        <Text style={type.headline}>How Bodivex earns</Text>
        <Text style={type.caption}>
          Listing is free. When you accept a new client you pay a one-time ₹{CONFIG.newClientFee}. Your first{' '}
          {CONFIG.freeClientsPerTrainer} clients are free, and returning clients never cost anything.
        </Text>
      </Glass>
    </OnboardingShell>
  );
}
