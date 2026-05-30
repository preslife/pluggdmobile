import { registerRootComponent } from 'expo';
import { ExpoRoot } from 'expo-router';
import React from 'react';

export function App() {
  const ctx = (require as unknown as { context: (directory: string) => unknown }).context('./app');
  return React.createElement(ExpoRoot, { context: ctx as any });
}

registerRootComponent(App);
