import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { COMMUNITY_TABS, type CommunityTabKey } from './communityFeedTypes';

const COLORS = {
  surface: '#12121A',
  border: '#262637',
  orange: '#FF5A00',
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
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {COMMUNITY_TABS.map((tab) => {
        const active = tab.key === value;
        return (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`${tab.label} community tab`}
            style={[styles.pill, active && styles.pillActive]}
            onPress={() => onChange(tab.key)}
          >
            <MaterialIcons name={tab.icon as any} size={18} color={active ? '#08080C' : COLORS.muted} />
            <Text style={[styles.label, active && styles.labelActive]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function CommunityBottomDockControls({ onChange }: { onChange: (next: CommunityTabKey) => void }) {
  const router = useRouter();
  const controls = [
    { id: 'feed', label: 'Feed', icon: 'dynamic-feed', action: () => onChange('feed') },
    { id: 'stories', label: 'Stories', icon: 'auto-stories', action: () => onChange('feed') },
    { id: 'create', label: 'Create Post', icon: 'post-add', action: () => router.push('/create-post' as any) },
    { id: 'boards', label: 'Boards', icon: 'forum', action: () => onChange('boards') },
    { id: 'nearby', label: 'Nearby', icon: 'place', action: () => router.push('/events' as any) },
  ];

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickRow}>
      {controls.map((item) => (
        <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={item.label} style={styles.quickButton} onPress={item.action}>
          <View style={styles.quickIcon}>
            <MaterialIcons name={item.icon as any} size={18} color={COLORS.orange} />
          </View>
          <Text style={styles.quickLabel}>{item.label}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  pill: {
    minHeight: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  pillActive: {
    backgroundColor: COLORS.orange,
    borderColor: COLORS.orange,
  },
  label: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: '900',
  },
  labelActive: {
    color: '#08080C',
  },
  quickRow: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 10,
  },
  quickButton: {
    minWidth: 82,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: 'rgba(18,18,26,0.86)',
    paddingHorizontal: 11,
    paddingVertical: 10,
    alignItems: 'center',
    gap: 7,
  },
  quickIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,90,0,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLabel: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '900',
  },
});
