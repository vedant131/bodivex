import React, { Component, ReactNode, Suspense, lazy } from 'react';
import { View, Text } from 'react-native';
import { T } from '../../constants/theme';

/**
 * Loads the 3D engine only when the landing page shows (not at app start), behind an
 * error boundary: if 3D can't run on a device, the page simply shows without it.
 */
const Dumbbell3D = lazy(() => import('./Dumbbell3D').then((m) => ({ default: m.Dumbbell3D })));

class Boundary extends Component<{ children: ReactNode; height: number }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(e: Error) { console.warn('3D hero unavailable', e); }
  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    // Note: temporary diagnostic so a phone screenshot shows the cause; remove once 3D is fixed on iOS
    return (
      <View style={{ height: this.props.height, justifyContent: 'center' }}>
        <Text selectable style={{ color: T.text3, fontSize: 10 }}>
          3D unavailable: {String(error.message)}{'\n'}{(error.stack ?? '').split('\n').slice(0, 6).join('\n')}
        </Text>
      </View>
    );
  }
}

export function Hero3D({ height }: { height: number }) {
  return (
    <Boundary height={height}>
      <Suspense fallback={<View style={{ height }} />}>
        <Dumbbell3D height={height} />
      </Suspense>
    </Boundary>
  );
}
