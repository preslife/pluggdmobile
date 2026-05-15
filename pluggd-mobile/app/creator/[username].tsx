import { useLocalSearchParams } from 'expo-router';
import { PublicCreatorProfileScreen } from '../../src/features/profiles/PublicCreatorProfileScreen';

export default function CreatorUsernameRoute() {
  const { username } = useLocalSearchParams<{ username: string }>();
  return <PublicCreatorProfileScreen username={username} />;
}
