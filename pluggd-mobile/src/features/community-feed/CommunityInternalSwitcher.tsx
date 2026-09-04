import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { pluggdFonts } from '../../design/typography';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { type CommunityTabKey } from './communityFeedTypes';
import { useAuth } from '../../context/AuthProvider';
import { selectionHaptic } from '../../design/haptics';
import { usePluggdTheme } from '../../design/usePluggdTheme';
import { useMemo } from 'react';

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
  const styles = useCommunitySwitcherStyles();
  const theme = usePluggdTheme();
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
          <View key={item.id} style={styles.dockSlot}>
            <Pressable
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
                  <View style={styles.postButtonDepth} />
                  <LinearGradient colors={['#ffad63', '#ff7614', '#ed5200']} locations={[0, 0.5, 1]} style={styles.postIconShell}>
                    <MaterialIcons name="add" size={28} color="#120a04" />
                  </LinearGradient>
                </View>
              ) : (
                <View style={[styles.iconShell, item.active && styles.iconShellActive]}>
                  <MaterialIcons name={item.icon as any} size={19} color={item.active ? theme.colors.text : theme.colors.textMuted} />
                </View>
              )}
              {!isPost ? (
                <Text maxFontSizeMultiplier={1.2} style={[styles.dockLabel, item.active && styles.dockLabelActive]}>
                  {item.label}
                </Text>
              ) : null}
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

export function CommunityBottomDockControls({ onChange }: { onChange: (next: CommunityTabKey) => void }) {
  const styles = useCommunitySwitcherStyles();
  const theme = usePluggdTheme();
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
        <Pressable
          key={item.id}
          accessibilityRole="button"
          accessibilityLabel={item.label}
          style={styles.quickButton}
          onPress={() => {
            selectionHaptic();
            item.action();
          }}
        >
          <Text style={styles.quickIndex}>{String(index + 1).padStart(2, '0')}</Text>
          <View style={styles.quickIcon}>
            <MaterialIcons name={item.icon as any} size={20} color={theme.colors.accentText} />
          </View>
          <Text style={styles.quickLabel}>{item.label}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

function useCommunitySwitcherStyles() {
  const theme = usePluggdTheme();
  return useMemo(() => StyleSheet.create({
  dockShell: {
    height: 68,
    marginHorizontal: 10,
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 5,
    paddingVertical: 4,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceStrong,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: theme.colors.shadow,
    shadowOpacity: 0.48,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
  dockSlot: {
    flex: 1,
    minWidth: 0,
    height: 56,
    alignItems: 'stretch',
  },
  dockItem: {
    width: '100%',
    height: 56,
    paddingHorizontal: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  dockItemPressed: { opacity: 0.76, transform: [{ scale: 0.96 }] },
  postItem: { marginTop: -10 },
  iconShell: { alignSelf: 'center', width: 44, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  iconShellActive: {
    backgroundColor: theme.scheme === 'light' ? 'rgba(232,79,0,0.10)' : 'rgba(255,102,0,0.16)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.borderAccent,
  },
  postButtonStage: {
    width: 54,
    height: 56,
    alignItems: 'center',
    justifyContent: 'flex-start',
    shadowColor: COLORS.orange,
    shadowOpacity: theme.scheme === 'light' ? 0.3 : 0.46,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 9 },
  },
  postButtonDepth: {
    position: 'absolute',
    top: 40,
    width: 50,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#9b3100',
    borderWidth: 1,
    borderColor: 'rgba(76,25,0,0.72)',
  },
  postIconShell: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,211,173,0.82)',
    zIndex: 1,
  },
  dockLabel: {
    alignSelf: 'stretch',
    width: '100%',
    paddingHorizontal: 0,
    textAlign: 'center',
    color: theme.colors.textMuted,
    fontSize: 10,
    lineHeight: 12,
    fontFamily: pluggdFonts.satoshiBold, fontWeight: '700',
  },
  dockLabelActive: {
    color: theme.colors.text,
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
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 11,
    paddingVertical: 10,
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 5,
  },
  quickIndex: { color: theme.colors.textMuted, fontSize: 8.5, fontFamily: pluggdFonts.satoshiBlack, letterSpacing: 1 },
  quickIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: theme.scheme === 'light' ? 'rgba(232,79,0,0.10)' : 'rgba(255,102,0,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLabel: {
    color: theme.colors.text,
    fontSize: 11,
    fontFamily: pluggdFonts.satoshiBold, fontWeight: '700',
  },
  }), [theme]);
}
