import { useLocalSearchParams } from 'expo-router';
import { CarnivalHubScreen } from '../../src/features/carnival/CarnivalHubScreen';
import { HubsParityScreen } from '../../src/features/parity/AppWideParityScreens';

export default function HubDetailRoute() {
  const { slug } = useLocalSearchParams<{ slug?: string }>();
  if (slug === 'notting-hill-carnival-2026') return <CarnivalHubScreen />;
  return <HubsParityScreen />;
}
