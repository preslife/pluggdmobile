import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AccountMenuButton } from '../../../components/AccountMenuButton';
import { BrandLogo } from '../../../components/BrandLogo';
import { GlassAvatar } from '../../../components/liquid-glass';
import { selectionHaptic } from '../../design/haptics';

export function DiscoveryHeader() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.wrap, { paddingTop: insets.top + 4 }]}>
      <Pressable accessibilityRole="button" accessibilityLabel="Go to Home" onPress={() => router.push('/' as any)}>
        <BrandLogo variant="dark" width={88} height={24} />
      </Pressable>
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open PLUGGD Live"
          style={({ pressed }) => [styles.livePill, pressed && styles.livePillPressed]}
          onPress={() => {
            selectionHaptic();
            router.push('/live' as any);
          }}
        >
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Search PLUGGD"
          style={styles.action}
          onPress={() => {
            selectionHaptic();
            router.push('/search' as any);
          }}
        >
          <MaterialIcons name="search" size={23} color="#F7F2E9" />
        </Pressable>
        <AccountMenuButton accessibilityLabel="Open account menu" style={[styles.action, styles.account]}>
          {(identity) => (
            <GlassAvatar imageUrl={identity.profile?.avatar_url} name={identity.displayName} size={32} tone="accent" />
          )}
        </AccountMenuButton>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: 94,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0A0908',
  },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  livePill: { minWidth: 56, height: 44, borderRadius: 22, paddingHorizontal: 9, borderWidth: 1, borderColor: 'rgba(255,71,87,0.38)', backgroundColor: 'rgba(255,71,87,0.09)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  livePillPressed: { transform: [{ scale: 0.96 }], opacity: 0.86 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FF4757' },
  liveText: { color: '#FF8B93', fontFamily: 'Satoshi-Black', fontSize: 8.5, letterSpacing: 1 },
  action: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  account: { borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(247,242,233,0.28)' },
});
