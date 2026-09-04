import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAccountMenuIdentity } from './AccountMenuButton';
import type { PluggdTheme } from '../src/design/tokens';
import { pluggdFonts } from '../src/design/typography';
import { usePluggdTheme } from '../src/design/usePluggdTheme';
import type { EcosystemRole } from '../src/lib/mobileNavigation';

export function CreatorAccessGate({
  children,
  requiredRoles,
  title = 'Creator access required',
  body = 'Add a creator role to use this workspace. Your fan profile and library stay exactly as they are.',
}: {
  children: ReactNode;
  requiredRoles?: EcosystemRole[];
  title?: string;
  body?: string;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const identity = useAccountMenuIdentity();
  const theme = usePluggdTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const hasRequiredRole = requiredRoles?.length
    ? requiredRoles.some((role) => identity.roles.includes(role))
    : identity.creatorAccess;

  if (!identity.ready) {
    return <View style={styles.loading}><StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} /><ActivityIndicator color={theme.colors.accentText} /></View>;
  }

  if (identity.signedIn && hasRequiredRole) return <>{children}</>;

  const signedOut = !identity.signedIn;
  return (
    <View style={[styles.screen, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 20 }]}>
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Return to PLUGGD"
        onPress={() => router.replace('/' as any)}
        style={styles.back}
      >
        <MaterialIcons name="arrow-back" size={21} color={theme.colors.text} />
      </Pressable>
      <View style={styles.card}>
        <View style={styles.icon}><MaterialIcons name="workspace-premium" size={31} color={theme.colors.onAccent} /></View>
        <Text style={styles.kicker}>{requiredRoles?.length ? 'EVENT OPERATIONS' : 'CREATOR WORKSPACE'}</Text>
        <Text accessibilityRole="header" style={styles.title}>{signedOut ? 'Sign in to continue' : title}</Text>
        <Text style={styles.body}>
          {signedOut ? 'Sign in first, then PLUGGD will open the tools available to your account.' : body}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={signedOut ? 'Sign in' : 'Add a creator role'}
          onPress={() => router.push((signedOut ? '/auth/login' : '/auth/role') as any)}
          style={styles.primary}
        >
          <Text style={styles.primaryText}>{signedOut ? 'SIGN IN' : 'ADD A CREATOR ROLE'}</Text>
          <MaterialIcons name="arrow-forward" size={20} color={theme.colors.onAccent} />
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => router.replace('/' as any)} style={styles.secondary}>
          <Text style={styles.secondaryText}>BACK TO PLUGGD</Text>
        </Pressable>
      </View>
    </View>
  );
}

function createStyles(theme: PluggdTheme) {
  return StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background },
  screen: { flex: 1, backgroundColor: theme.colors.background, paddingHorizontal: 18 },
  back: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.controlBorder, backgroundColor: theme.colors.surface },
  card: { flex: 1, justifyContent: 'center', alignItems: 'flex-start', paddingBottom: 42 },
  icon: { width: 62, height: 62, borderRadius: 18, backgroundColor: theme.colors.accentFill, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  kicker: { color: theme.colors.accentText, fontFamily: pluggdFonts.satoshiBlack, fontSize: 10, letterSpacing: 1.7 },
  title: { color: theme.colors.text, fontFamily: pluggdFonts.displayExtraBold, fontSize: 34, lineHeight: 39, letterSpacing: -1, marginTop: 8, maxWidth: 340 },
  body: { color: theme.colors.textSecondary, fontFamily: pluggdFonts.satoshiMedium, fontSize: 14, lineHeight: 21, marginTop: 12, maxWidth: 340 },
  primary: { width: '100%', minHeight: 54, marginTop: 26, borderRadius: 14, paddingHorizontal: 16, backgroundColor: theme.colors.accentFill, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  primaryText: { color: theme.colors.onAccent, fontFamily: pluggdFonts.satoshiBlack, fontSize: 12, letterSpacing: 0.8 },
  secondary: { width: '100%', minHeight: 50, marginTop: 10, borderRadius: 14, borderWidth: 1, borderColor: theme.colors.controlBorder, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { color: theme.colors.text, fontFamily: pluggdFonts.satoshiBlack, fontSize: 11, letterSpacing: 0.8 },
  });
}
