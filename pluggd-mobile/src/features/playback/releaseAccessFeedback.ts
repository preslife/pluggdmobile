import { Alert, type AlertButton } from 'react-native';
import { openBrowserAsync } from 'expo-web-browser';
import { releaseAccessRecoveryUrl } from './releaseAgeAccess';

/** A fixed existing website flow; no bearer token or private details in URLs. */
export function releaseAccessAlertButtons(error: unknown): AlertButton[] | undefined {
  const url = releaseAccessRecoveryUrl(error);
  if (!url) return undefined;
  return [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Open account on web', onPress: () => {
      void openBrowserAsync(url).catch(() => Alert.alert('Could not open PLUGGD', 'Open pluggd.fm in your browser, then Settings → Profile & account → Optional personal details.'));
    } },
  ];
}
