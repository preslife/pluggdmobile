import { Stack } from 'expo-router';
import { OpportunitiesScreen } from '../../src/features/opportunities/OpportunityScreens';

export default function OpportunitiesRoute() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <OpportunitiesScreen />
    </>
  );
}
