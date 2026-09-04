
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { usePluggdTheme } from '../../src/design/usePluggdTheme';

export default function CreatorLayout() {
    const theme = usePluggdTheme();
    return (
        <>
            <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
            <Stack
                screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: theme.colors.background },
                }}
            />
        </>
    );
}
