import { useLocalSearchParams } from 'expo-router';
import { PublicCreatorProfileScreen } from '../../src/features/profiles/PublicCreatorProfileScreen';

export default function UserIdProfileRoute() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  return <PublicCreatorProfileScreen userId={userId} />;
}
