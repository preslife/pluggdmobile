import { Alert, type AlertButton } from 'react-native';
import { router } from 'expo-router';
import { releaseAccessRecoveryRoute } from './releaseAgeAccess';

/** The existing native completion route carries no private values or tokens. */
export function releaseAccessAlertButtons(error: unknown): AlertButton[] | undefined {
  const route = releaseAccessRecoveryRoute(error);
  if (!route) return undefined;
  return [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Add date of birth', onPress: () => {
      try { router.push(route); }
      catch { Alert.alert('Could not open your age details', 'Please try playing this music again to retry.'); }
    } },
  ];
}
