import { Stack, useLocalSearchParams } from 'expo-router';
import { OpportunityDetailScreen } from '../../src/features/opportunities/OpportunityScreens';

export default function OpportunityDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string | string[] }>();
  const identifier = Array.isArray(id) ? id[0] ?? '' : id ?? '';
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <OpportunityDetailScreen identifier={identifier} />
    </>
  );
}
