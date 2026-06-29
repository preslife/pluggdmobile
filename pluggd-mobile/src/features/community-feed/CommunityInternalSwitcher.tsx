import { MaterialIcons } from '@expo/vector-icons';
import { pluggdFonts } from '../../design/typography';
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
            <MaterialIcons name={tab.icon as any} size={15} color={active ? COLORS.white : COLORS.muted} />
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
    { id: 'stories', label: 'Stories', icon: 'auto-stories', action: () => onChange('feed') },
    { id: 'create', label: 'Create Post', icon: 'post-add', action: () => router.push('/create-post' as any) },
    { id: 'boards', label: 'Boards', icon: 'forum', action: () => onChange('boards') },
    { id: 'nearby', label: 'Nearby', icon: 'place', action: () => router.push('/events' as any) },
    { id: 'communities', label: 'Communities', icon: 'groups', action: () => onChange('communities') },
    { id: 'explore', label: 'Explore', icon: 'explore', action: () => onChange('explore') },
  ];

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickRow}>
      {controls.map((item) => (
        <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={item.label} style={styles.quickButton} onPress={item.action}>
          <View style={styles.quickIcon}>
            <MaterialIcons name={item.icon as any} size={17} color={COLORS.muted} />
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
    paddingVertical: 3,
    gap: 7,
  },
  pill: {
    minHeight: 31,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: 'rgba(18,20,32,0.34)',
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pillActive: {
    backgroundColor: 'rgba(255,255,255,0.075)',
    borderColor: 'rgba(255,255,255,0.22)',
  },
  label: {
    color: COLORS.muted,
    fontSize: 11,
    fontFamily: pluggdFonts.satoshiBold, fontWeight: '700',
  },
  labelActive: {
    color: COLORS.white,
    fontFamily: pluggdFonts.satoshiBold, fontWeight: '800',
  },
  quickRow: {
    paddingHorizontal: 16,
    paddingTop: 2,
    paddingBottom: 2,
    gap: 9,
  },
  quickButton: {
    minWidth: 94,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: 'rgba(18,20,32,0.44)',
    paddingHorizontal: 11,
    paddingVertical: 9,
    alignItems: 'center',
    gap: 7,
  },
  quickIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLabel: {
    color: COLORS.white,
    fontSize: 11,
    fontFamily: pluggdFonts.satoshiBold, fontWeight: '700',
  },
});
