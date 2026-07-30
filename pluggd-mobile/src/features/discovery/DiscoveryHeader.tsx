import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BrandLogo } from '../../../components/BrandLogo';
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
          accessibilityLabel="Search PLUGGD"
          style={styles.action}
          onPress={() => {
            selectionHaptic();
            router.push('/search' as any);
          }}
        >
          <MaterialIcons name="search" size={23} color="#F7F2E9" />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open My PLUGGD"
          style={[styles.action, styles.account]}
          onPress={() => router.push('/my-pluggd' as any)}
        >
          <MaterialIcons name="person-outline" size={20} color="#F7F2E9" />
        </Pressable>
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
  action: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  account: { borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(247,242,233,0.28)' },
});
