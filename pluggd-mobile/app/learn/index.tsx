import { Stack } from 'expo-router';
import { AcademyCatalogueScreen } from '../../src/features/academy/AcademyScreens';

export default function LearnRoute() {
  return <><Stack.Screen options={{ headerShown: false }} /><AcademyCatalogueScreen /></>;
}
