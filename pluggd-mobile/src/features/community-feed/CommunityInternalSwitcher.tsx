import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { pluggdFonts } from '../../design/typography';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { type CommunityTabKey } from './communityFeedTypes';
import { useAuth } from '../../context/AuthProvider';
import { selectionHaptic } from '../../design/haptics';

const COLORS = {
  surface: '#171310',
  border: '#2a221a',
  orange: '#ff6600',
  white: '#FFFFFF',
  muted: '#8E8E9F',
};

export function CommunityInternalSwitcher({
  value,
  onChange,
}: {
  value: CommunityTabKey;
  onChange: (next: CommunityTabKey) => void;
}) {
  const router = useRouter();
  const { user } = useAuth();
  const dockItems = [
    { id: 'feed', label: 'Feed', icon: 'local-fire-department', active: value === 'feed', action: () => onChange('feed') },
    { id: 'boards', label: 'Boards', icon: 'forum', active: value === 'boards', action: () => onChange('boards') },
    { id: 'post', label: 'Post', icon: 'add', active: false, action: () => router.push(user?.id ? { pathname: '/create-post', params: { returnTo: '/community' } } as any : '/auth/login' as any) },
    { id: 'explore', label: 'Explore', icon: 'explore', active: value === 'explore' || value === 'communities', action: () => onChange('explore') },
    { id: 'maps', label: 'Maps', icon: 'public', active: false, action: () => router.push('/maps' as any) },
  ] as const;

  return (
    <View style={styles.dockShell}>
      {dockItems.map((item) => {
        const isPost = item.id === 'post';
        return (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            accessibilityState={isPost ? undefined : { selected: item.active }}
            accessibilityLabel={isPost ? (user?.id ? 'Create post' : 'Sign in to create a post') : `${item.label} community tab`}
            accessibilityHint={isPost ? 'Opens the community post composer' : undefined}
            style={({ pressed }) => [styles.dockItem, isPost && styles.postItem, pressed && styles.dockItemPressed]}
            onPress={() => {
              selectionHaptic();
              item.action();
            }}
          >
            {isPost ? (
              <View style={styles.postButtonStage}>
                <View style={styles.postButtonBevel} />
                <LinearGradient colors={['#ff8a24', '#ff6600', '#d94700']} locations={[0, 0.57, 1]} style={styles.postIconShell}>
                  <View style={styles.postButtonHighlight} />
                  <MaterialIcons name="add" size={28} color="#120a04" />
                </LinearGradient>
              </View>
            ) : (
              <View style={[styles.iconShell, item.active && styles.iconShellActive]}>
                <MaterialIcons name={item.icon as any} size={19} color={item.active ? COLORS.white : COLORS.muted} />
              </View>
            )}
            {!isPost ? <Text style={[styles.dockLabel, item.active && styles.dockLabelActive]}>{item.label}</Text> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

export function CommunityBottomDockControls({ onChange }: { onChange: (next: CommunityTabKey) => void }) {
  const router = useRouter();
  const controls = [
    { id: 'stories', label: 'Stories', icon: 'auto-stories', action: () => onChange('feed') },
    { id: 'the-plug', label: 'THE PLUG', icon: 'newspaper', action: () => router.push('/plug' as any) },
    { id: 'create', label: 'Create Post', icon: 'post-add', action: () => router.push('/create-post' as any) },
    { id: 'boards', label: 'Boards', icon: 'forum', action: () => onChange('boards') },
    { id: 'nearby', label: 'Nearby', icon: 'place', action: () => router.push('/events' as any) },
    { id: 'communities', label: 'Communities', icon: 'groups', action: () => onChange('communities') },
    { id: 'explore', label: 'Explore', icon: 'explore', action: () => onChange('explore') },
  ];

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickRow}>
      {controls.map((item, index) => (
        <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={item.label} style={styles.quickButton} onPress={item.action}>
          <Text style={styles.quickIndex}>{String(index + 1).padStart(2, '0')}</Text>
          <View style={styles.quickIcon}>
            <MaterialIcons name={item.icon as any} size={20} color={COLORS.orange} />
          </View>
          <Text style={styles.quickLabel}>{item.label}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  dockShell: {
    height: 68,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 5,
    paddingVertical: 4,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(18,15,13,0.96)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000000',
    shadowOpacity: 0.48,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
  dockItem: {
    flex: 1,
    minWidth: 0,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  dockItemPressed: { opacity: 0.76, transform: [{ scale: 0.96 }] },
  postItem: { marginTop: -10 },
  iconShell: { width: 34, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  iconShellActive: {
    backgroundColor: 'rgba(255,102,0,0.16)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,137,65,0.42)',
  },
  postButtonStage: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'flex-start',
    shadowColor: COLORS.orange,
    shadowOpacity: 0.34,
    shadowRadius: 13,
    shadowOffset: { width: 0, height: 8 },
  },
  postButtonBevel: {
    position: 'absolute',
    left: 2,
    right: 2,
    bottom: 0,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#7d2600',
    borderWidth: 1,
    borderColor: '#b43a00',
  },
  postIconShell: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ff9b4f',
  },
  postButtonHighlight: {
    position: 'absolute',
    top: 3,
    left: 9,
    right: 9,
    height: 1,
    borderRadius: 1,
    backgroundColor: 'rgba(255,255,255,0.56)',
  },
  dockLabel: {
    color: COLORS.muted,
    fontSize: 10,
    lineHeight: 12,
    fontFamily: pluggdFonts.satoshiBold, fontWeight: '700',
  },
  dockLabelActive: {
    color: COLORS.white,
    fontFamily: pluggdFonts.satoshiBold, fontWeight: '800',
  },
  quickRow: {
    paddingHorizontal: 20,
    paddingTop: 2,
    paddingBottom: 2,
    gap: 9,
  },
  quickButton: {
    minWidth: 116,
    minHeight: 92,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: 'rgba(18,20,32,0.44)',
    paddingHorizontal: 11,
    paddingVertical: 10,
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 5,
  },
  quickIndex: { color: COLORS.muted, fontSize: 8.5, fontFamily: pluggdFonts.satoshiBlack, letterSpacing: 1 },
  quickIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,102,0,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLabel: {
    color: COLORS.white,
    fontSize: 11,
    fontFamily: pluggdFonts.satoshiBold, fontWeight: '700',
  },
});
