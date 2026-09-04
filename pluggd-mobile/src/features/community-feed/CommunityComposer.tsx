import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthProvider';
import { MaterialIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import { selectionHaptic } from '../../design/haptics';
import { usePluggdTheme } from '../../design/usePluggdTheme';

export function CommunityComposer({ compact = false, embedded = false, topOffset, bottomOffset }: { compact?: boolean; embedded?: boolean; topOffset?: number; bottomOffset?: number }) {
  const router = useRouter();
  const { user } = useAuth();
  const theme = usePluggdTheme();

  const signedIn = Boolean(user?.id);
  const button = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={signedIn ? 'Create post' : 'Sign in to create a post'}
      accessibilityHint="Opens the community post composer"
      hitSlop={8}
      style={({ pressed }) => [styles.composer, { backgroundColor: theme.colors.accentFill, borderColor: theme.colors.borderStrong, shadowColor: theme.colors.shadow }, compact && styles.composerCompact, pressed && styles.composerPressed]}
      onPress={() => {
        selectionHaptic();
        router.push(signedIn ? '/create-post' as any : '/auth/login' as any);
      }}
    >
      <MaterialIcons name="add" size={compact ? 27 : 32} color={theme.colors.onAccent} />
    </Pressable>
  );

  if (embedded) return button;

  return <View pointerEvents="box-none" style={[styles.anchor, topOffset == null ? { bottom: bottomOffset } : { top: topOffset }]}>{button}</View>;
}

const styles = StyleSheet.create({
  anchor: {
    position: 'absolute',
    right: 20,
    width: 58,
    height: 58,
    zIndex: 90,
    elevation: 18,
  },
  composer: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.28)',
    backgroundColor: '#ff6600',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.62,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
  composerPressed: { transform: [{ scale: 0.94 }], opacity: 0.9 },
  composerCompact: {
    width: 44,
    height: 44,
    borderRadius: 22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
});
