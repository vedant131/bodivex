import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  FadeInUp, FadeOutUp, ZoomIn, FadeIn, useSharedValue, useAnimatedProps, withTiming, withDelay, Easing,
} from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';
import { create } from 'zustand';
import { FullWindowOverlay } from 'react-native-screens';
import { Glass } from './Glass';
import { Button } from './Button';
import { T, type } from '../../constants/theme';

/* ─── Store ──────────────────────────────────────────────────────────────── */

type Kind = 'success' | 'error' | 'info';
type SheetButton = { text?: string; style?: 'default' | 'cancel' | 'destructive'; onPress?: () => void };

interface FeedbackState {
  toast: { id: number; title: string; message?: string; kind: Kind } | null;
  sheet: { title: string; message?: string; buttons: SheetButton[] } | null;
  success: { title: string; message?: string } | null;
}
const useFeedback = create<FeedbackState>(() => ({ toast: null, sheet: null, success: null }));

const haptic = (k: Kind) => {
  if (Platform.OS === 'web') return;
  Haptics.notificationAsync(
    k === 'success' ? Haptics.NotificationFeedbackType.Success : k === 'error' ? Haptics.NotificationFeedbackType.Error : Haptics.NotificationFeedbackType.Warning
  ).catch(() => {});
};

const ERROR = /could not|couldn't|failed|error|not sent|not posted|not saved|invalid|expired|unavailable|no chat yet/i;
const SUCCESS = /confirmed|sent|updated|published|uploaded|saved|added|thanks|live|declined|cancelled|done/i;

let toastTimer: ReturnType<typeof setTimeout> | null = null;

export const toast = (title: string, message?: string, kind?: Kind) => {
  const k = kind ?? (ERROR.test(title) ? 'error' : SUCCESS.test(title) ? 'success' : 'info');
  haptic(k);
  useFeedback.setState({ toast: { id: Date.now(), title, message, kind: k } });
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => useFeedback.setState({ toast: null }), k === 'error' ? 4200 : 2800);
};

/** Big animated tick for moments that matter (booking sent, client accepted, profile live). */
export const celebrate = (title: string, message?: string) => {
  haptic('success');
  useFeedback.setState({ success: { title, message } });
  setTimeout(() => useFeedback.setState({ success: null }), 2200);
};

/**
 * Drop-in replacement for React Native's Alert.alert, rendered in the glass style.
 * One (or no) button -> toast. Several buttons -> confirm sheet with the same callbacks.
 */
export const Alert = {
  alert(title: string, message?: string, buttons?: SheetButton[]) {
    if (!buttons || buttons.length <= 1) {
      toast(title, message);
      buttons?.[0]?.onPress?.();
      return;
    }
    haptic('info');
    useFeedback.setState({ sheet: { title, message, buttons } });
  },
};

/* ─── Host (mounted once in app/_layout) ─────────────────────────────────── */

/** iOS: draw above any open Modal (e.g. a toast raised from inside a sheet). */
const Overlay = ({ children }: { children: React.ReactNode }) =>
  Platform.OS === 'ios' ? <FullWindowOverlay>{children}</FullWindowOverlay> : <>{children}</>;

const ACircle = Animated.createAnimatedComponent(Circle);
const APath = Animated.createAnimatedComponent(Path);

function SuccessTick() {
  const ring = useSharedValue(0);
  const tick = useSharedValue(0);
  useEffect(() => {
    ring.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) });
    tick.value = withDelay(350, withTiming(1, { duration: 350, easing: Easing.out(Easing.cubic) }));
  }, []);
  const C = 2 * Math.PI * 40;
  const ringProps = useAnimatedProps(() => ({ strokeDashoffset: C * (1 - ring.value) }));
  const tickProps = useAnimatedProps(() => ({ strokeDashoffset: 60 * (1 - tick.value) }));
  return (
    <Svg width={100} height={100} viewBox="0 0 100 100">
      <Circle cx={50} cy={50} r={40} stroke={T.ring2} strokeOpacity={0.2} strokeWidth={7} fill="none" />
      <ACircle cx={50} cy={50} r={40} stroke={T.ring2} strokeWidth={7} fill="none" strokeLinecap="round"
        strokeDasharray={`${C} ${C}`} animatedProps={ringProps} transform="rotate(-90 50 50)" />
      <APath d="M32 51 L45 63 L69 38" stroke={T.ring2} strokeWidth={8} fill="none" strokeLinecap="round" strokeLinejoin="round"
        strokeDasharray="60 60" animatedProps={tickProps} />
    </Svg>
  );
}

const ICON: Record<Kind, { name: keyof typeof Ionicons.glyphMap; color: string }> = {
  success: { name: 'checkmark-circle', color: T.ring2 },
  error: { name: 'alert-circle', color: T.danger },
  info: { name: 'information-circle', color: T.ring3 },
};

export function FeedbackHost() {
  const insets = useSafeAreaInsets();
  const { toast: t, sheet, success } = useFeedback();
  const closeSheet = () => useFeedback.setState({ sheet: null });

  return (
    <>
      {t && (
        <Overlay>
        <Animated.View key={t.id} entering={FadeInUp.springify().damping(16)} exiting={FadeOutUp.duration(200)}
          style={[styles.toastWrap, { top: insets.top + 8 }]} pointerEvents="box-none">
          <Pressable onPress={() => useFeedback.setState({ toast: null })} accessibilityRole="alert" accessibilityLabel={`${t.title}. ${t.message ?? ''}`}>
            <Glass radius={T.radius.xl} style={[styles.toast, t.kind === 'error' && { borderColor: 'rgba(255,69,58,0.45)' }]}>
              <Ionicons name={ICON[t.kind].name} size={24} color={ICON[t.kind].color} />
              <View style={{ flex: 1 }}>
                <Text style={type.headline} numberOfLines={2}>{t.title}</Text>
                {!!t.message && <Text style={[type.caption, { marginTop: 2 }]} numberOfLines={4}>{t.message}</Text>}
              </View>
            </Glass>
          </Pressable>
        </Animated.View>
        </Overlay>
      )}

      <Modal visible={!!sheet} transparent animationType="fade" onRequestClose={closeSheet}>
        <Pressable style={styles.scrim} onPress={() => {
          sheet?.buttons.find((b) => b.style === 'cancel')?.onPress?.();
          closeSheet();
        }}>
          {sheet && (
            <Pressable onPress={() => {}}>
              <Animated.View entering={FadeInUp.springify().damping(18)}>
                <Glass radius={T.radius.xl} style={[styles.sheet, { marginBottom: insets.bottom + 8 }]}>
                  <Text style={type.title}>{sheet.title}</Text>
                  {!!sheet.message && <Text style={[type.body, { color: T.text2 }]}>{sheet.message}</Text>}
                  <View style={{ gap: 10, marginTop: 6 }}>
                    {[...sheet.buttons]
                      .sort((a, b) => Number(a.style === 'cancel') - Number(b.style === 'cancel'))
                      .map((b, i) => (
                        <Button
                          key={i}
                          title={b.text ?? 'OK'}
                          variant={b.style === 'cancel' ? 'glass' : b.style === 'destructive' ? 'danger' : 'primary'}
                          size="md"
                          onPress={() => { closeSheet(); b.onPress?.(); }}
                        />
                      ))}
                  </View>
                </Glass>
              </Animated.View>
            </Pressable>
          )}
        </Pressable>
      </Modal>

      {success && (
        <Overlay>
        <Animated.View entering={FadeIn.duration(150)} style={styles.successScrim} pointerEvents="none">
          <Animated.View entering={ZoomIn.springify().damping(14)}>
            <Glass radius={T.radius.xl} style={styles.successCard}>
              <SuccessTick />
              <Text style={[type.title, { textAlign: 'center' }]}>{success.title}</Text>
              {!!success.message && <Text style={[type.caption, { textAlign: 'center' }]}>{success.message}</Text>}
            </Glass>
          </Animated.View>
        </Animated.View>
        </Overlay>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  toastWrap: { position: 'absolute', left: 12, right: 12, zIndex: 1000 },
  toast: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  scrim: { flex: 1, backgroundColor: T.scrim, justifyContent: 'flex-end', padding: 12 },
  sheet: { padding: 20, gap: 10 },
  successScrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', zIndex: 1001 },
  successCard: { alignItems: 'center', gap: 10, paddingVertical: 26, paddingHorizontal: 30, maxWidth: 300 },
});
