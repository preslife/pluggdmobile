import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../src/context/AuthProvider';
import { selectionHaptic } from '../src/design/haptics';
import { usePluggdTheme } from '../src/design/usePluggdTheme';
import {
  getCreateActions,
  hasCreatorAccess,
  resolveProfileRoles,
  type CreateAction,
  type CreateActionKey,
  type NavProfile,
  type ProfileRoleRow,
} from '../src/lib/mobileNavigation';
import { supabase } from '../src/lib/supabase';
import { GlassSheet, LiftSurface } from './liquid-glass';

const ACTION_ICONS: Record<CreateActionKey, keyof typeof MaterialIcons.glyphMap> = {
  release: 'upload',
  beat: 'headphones',
  mix: 'graphic-eq',
  soundboard: 'dashboard-customize',
  event: 'event',
  live: 'radio',
  studio: 'space-dashboard',
};

function CreateRow({ action, onPress }: { action: CreateAction; onPress: () => void }) {
  const theme = usePluggdTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={action.label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: pressed ? theme.colors.surfacePressed : theme.colors.surface,
          borderColor: theme.colors.border,
        },
      ]}
    >
      <View style={[styles.iconShell, { backgroundColor: theme.colors.surfaceStrong }]}>
        <MaterialIcons name={ACTION_ICONS[action.key]} size={21} color={theme.colors.accent} />
      </View>
      <View style={styles.rowCopy}>
        <Text style={[styles.rowTitle, { color: theme.colors.text }]}>{action.label}</Text>
        <Text style={[styles.rowMeta, { color: theme.colors.textMuted }]} numberOfLines={1}>
          {action.key === 'studio' ? 'Open Studio' : 'Creator action'}
        </Text>
      </View>
      <MaterialIcons name="chevron-right" size={22} color={theme.colors.textSubtle} />
    </Pressable>
  );
}

export function CreateActionSheet() {
  const router = useRouter();
  const { user } = useAuth();
  const theme = usePluggdTheme();
  const [profile, setProfile] = useState<NavProfile | null>(null);
  const [roleRows, setRoleRows] = useState<ProfileRoleRow[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (!user?.id) {
        setProfile(null);
        setRoleRows([]);
        return;
      }

      const [profileRes, rolesRes] = await Promise.all([
        (supabase as any)
          .from('profiles')
          .select('user_id,full_name,username,avatar_url,user_type,profile_type,is_creator,is_label,onboarding_progress')
          .eq('user_id', user.id)
          .maybeSingle(),
        (supabase as any).from('profile_roles').select('role,is_primary').eq('user_id', user.id),
      ]);

      if (!mounted) return;
      setProfile((profileRes.data as NavProfile | null) ?? null);
      setRoleRows(Array.isArray(rolesRes.data) ? (rolesRes.data as ProfileRoleRow[]) : []);
    };

    load();

    return () => {
      mounted = false;
    };
  }, [user?.id]);

  const roles = useMemo(() => resolveProfileRoles(profile, roleRows), [profile, roleRows]);
  const actions = useMemo(() => getCreateActions(roles), [roles]);

  if (!user?.id || !hasCreatorAccess(roles) || actions.length === 0) return null;

  const openRoute = (route: string) => {
    selectionHaptic();
    setOpen(false);
    router.push(route as any);
  };

  return (
    <>
      <LiftSurface depth="high" style={styles.floatingWrap}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Create"
          onPress={() => {
            selectionHaptic();
            setOpen(true);
          }}
          style={({ pressed }) => [
            styles.floatingButton,
            { backgroundColor: theme.colors.accent },
            pressed && styles.floatingButtonPressed,
          ]}
        >
          <MaterialIcons name="add" size={20} color="#08080C" />
          <Text style={styles.floatingText}>Create</Text>
        </Pressable>
      </LiftSurface>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable onPress={(event) => event.stopPropagation()}>
            <GlassSheet title="Create" subtitle="Start posts, uploads, live sessions and Studio tools.">
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetContent}>
                {actions.map((action) => (
                  <CreateRow key={action.key} action={action} onPress={() => openRoute(action.route)} />
                ))}
              </ScrollView>
            </GlassSheet>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  floatingWrap: {
    position: 'absolute',
    right: 16,
    bottom: 176,
    zIndex: 96,
  },
  floatingButton: {
    height: 44,
    borderRadius: 999,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.36)',
  },
  floatingButtonPressed: {
    transform: [{ scale: 0.985 }],
    opacity: 0.9,
  },
  floatingText: {
    color: '#08080C',
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
  },
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.64)',
  },
  sheetContent: {
    paddingBottom: 10,
  },
  row: {
    minHeight: 62,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  iconShell: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  rowTitle: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 15,
  },
  rowMeta: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 12,
  },
});
