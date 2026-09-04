import * as Haptics from 'expo-haptics';

export function selectionHaptic() {
  Haptics.selectionAsync().catch(() => undefined);
}

export function impactHaptic(style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) {
  Haptics.impactAsync(style).catch(() => undefined);
}

export function notificationHaptic(
  type: Haptics.NotificationFeedbackType = Haptics.NotificationFeedbackType.Success,
) {
  Haptics.notificationAsync(type).catch(() => undefined);
}
