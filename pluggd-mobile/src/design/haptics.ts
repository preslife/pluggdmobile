import * as Haptics from 'expo-haptics';

export function selectionHaptic() {
  Haptics.selectionAsync().catch(() => undefined);
}

export function impactHaptic(style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) {
  Haptics.impactAsync(style).catch(() => undefined);
}
