import React, { useEffect } from 'react';
import Animated, { useSharedValue, useAnimatedStyle, withSequence, withSpring } from 'react-native-reanimated';
import { View, StyleSheet, Text, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ComponentProps } from 'react';
import { Tabs } from 'expo-router/js-tabs';
import { PressableScale } from './PressableScale';
import { Glass } from './Glass';
import { T } from '../../constants/theme';

type BottomTabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

/** Floating glass tab bar (iOS 26 style). Screens add bottom padding of TAB_BAR_SPACE. */
export const TAB_BAR_SPACE = 104;

export function GlassTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.wrap, { bottom: Math.max(insets.bottom, 12) }]} pointerEvents="box-none">
      <Glass radius={30} style={styles.bar} interactive>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          if ((options as any).href === null) return null;
          const focused = state.index === index;
          const label = (options.title ?? route.name) as string;
          const onPress = () => {
            const e = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !e.defaultPrevented) navigation.navigate(route.name);
          };
          const badge = options.tabBarBadge;
          return (
            <PressableScale key={route.key} onPress={onPress} style={styles.item}
              accessibilityLabel={badge ? `${label}, ${badge} new` : label} accessibilityState={{ selected: focused }} scaleTo={0.9}>
              <TabIcon focused={focused}>
                {options.tabBarIcon?.({ focused, color: focused ? T.text : T.text3, size: 22 })}
              </TabIcon>
              {!!badge && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{typeof badge === 'number' && badge > 9 ? '9+' : badge}</Text>
                </View>
              )}
              <Text style={[styles.label, focused && { color: T.text }]} numberOfLines={1}>{label}</Text>
            </PressableScale>
          );
        })}
      </Glass>
    </View>
  );
}

/** Icon pill that springs up a little when its tab becomes active. */
function TabIcon({ focused, children }: { focused: boolean; children: React.ReactNode }) {
  const s = useSharedValue(1);
  useEffect(() => {
    if (focused) s.value = withSequence(withSpring(1.18, { damping: 8, stiffness: 400 }), withSpring(1, { damping: 12 }));
  }, [focused]);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return <Animated.View style={[styles.iconWrap, focused && styles.iconOn, anim]}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 16, right: 16 },
  bar: {
    flexDirection: 'row',
    height: 64,
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 6,
    ...Platform.select({ ios: { shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 24, shadowOffset: { width: 0, height: 10 } } }),
  },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
  iconWrap: { width: 44, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  iconOn: { backgroundColor: 'rgba(255,45,111,0.22)' },
  label: { fontSize: 10, fontWeight: '700', color: T.text3 },
  badge: {
    position: 'absolute', top: 2, left: '55%', minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 5,
    backgroundColor: T.accent, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: T.bg,
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
});
