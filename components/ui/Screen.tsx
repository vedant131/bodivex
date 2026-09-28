import React from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';
import { Backdrop } from './Backdrop';

/** Screen root: glowing backdrop + safe area. The glass surfaces on top need the glow behind them. */
export function Screen({ children, edges, style, preset = 'calm' }: {
  children: React.ReactNode;
  edges?: Edge[];
  style?: StyleProp<ViewStyle>;
  preset?: 'hero' | 'calm' | 'trainer';
}) {
  return (
    <View style={{ flex: 1 }}>
      <Backdrop preset={preset} />
      <SafeAreaView edges={edges} style={[{ flex: 1 }, style]}>
        {children}
      </SafeAreaView>
    </View>
  );
}
