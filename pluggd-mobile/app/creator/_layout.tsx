
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function CreatorLayout() {
    return (
        <>
            <StatusBar style="light" />
            <Stack
                screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: '#221910' } // Background dark
                }}
            />
        </>
    );
}
