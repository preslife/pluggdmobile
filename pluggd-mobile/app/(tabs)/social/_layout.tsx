
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function SocialLayout() {
    return (
        <>
            <StatusBar style="light" />
            <Stack
                screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: '#101522' } // Background dark
                }}
            />
        </>
    );
}
