import { Stack, useLocalSearchParams } from 'expo-router';
import { AcademyCourseScreen } from '../../src/features/academy/AcademyScreens';

export default function LearnCourseRoute() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  return <><Stack.Screen options={{ headerShown: false }} /><AcademyCourseScreen identifier={typeof slug === 'string' ? slug : ''} /></>;
}
