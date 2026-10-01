import React, { Component, ReactNode, Suspense, lazy } from 'react';
import { View } from 'react-native';

/**
 * The 3D engine is a separate chunk. Start preparing it as soon as the app loads
 * (this module is imported at startup via the landing route), so the dumbbell can
 * drop the moment the landing page shows. If 3D fails at render time on a device,
 * the page shows without it.
 */
const load = import('./Dumbbell3D');
const Dumbbell3D = lazy(() => load.then((m) => ({ default: m.Dumbbell3D })));
load.catch((e) => console.warn('3D hero failed to load', e));

class Boundary extends Component<{ children: ReactNode; height: number }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(e: Error) { console.warn('3D hero unavailable', e); }
  render() {
    return this.state.failed ? <View style={{ height: this.props.height }} /> : this.props.children;
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
