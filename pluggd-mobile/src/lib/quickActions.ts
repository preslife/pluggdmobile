import { ActionSheetIOS, Alert, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { impactHaptic } from '../design/haptics';

export type QuickAction = {
  label: string;
  onPress: () => void;
};

/**
 * Long-press quick actions: the native iOS action sheet, an Alert
 * fallback on Android, and a no-op on web. Fires a medium impact so the
 * long-press lands physically before the sheet appears.
 */
export function showQuickActions(title: string, actions: QuickAction[]) {
  if (!actions.length || Platform.OS === 'web') return;
  impactHaptic(Haptics.ImpactFeedbackStyle.Medium);

  if (Platform.OS === 'ios') {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title,
        options: [...actions.map((action) => action.label), 'Cancel'],
        cancelButtonIndex: actions.length,
      },
      (index) => {
        if (index >= 0 && index < actions.length) actions[index].onPress();
      },
    );
    return;
  }

  Alert.alert(title, undefined, [
    ...actions.map((action) => ({ text: action.label, onPress: action.onPress })),
    { text: 'Cancel', style: 'cancel' as const },
  ]);
}
