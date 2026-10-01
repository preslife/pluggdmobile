import { MaterialIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { pluggdFonts } from '../../design/typography';
import { usePluggdTheme } from '../../design/usePluggdTheme';
import { formatMusicTime, musicError, type MusicTrack } from './model';
import { loadPersonalMusic, rememberMusic, searchMusic } from './service';
import { MusicButton, SoundArtwork } from './MusicControls';

export function SoundPickerSheet({ visible, inline = false, userId, releaseId, selectedId, auditionId, auditionBusy, onClose, onSelect, onAudition }: {
  visible: boolean; userId: string; releaseId?: string; selectedId?: string; auditionId?: string; auditionBusy: boolean;
  inline?: boolean;
  onClose: () => void; onSelect: (track: MusicTrack) => void; onAudition: (track: MusicTrack) => void;
}) {
  const { colors } = usePluggdTheme();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<'all' | 'saved' | 'recent'>('all');
  const [query, setQuery] = useState('');
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [savingId, setSavingId] = useState<string | null>(null);
  useEffect(() => {
    if (!visible) return;
    let active = true;
    loadPersonalMusic(userId, 'saved').then(rows => { if (active) setSaved(new Set(rows.map(row => row.track_id))); }).catch(error => { if (active) setError(musicError(error)); });
    return () => { active = false; };
  }, [visible, userId]);
  useEffect(() => {
    if (!visible) return;
    let active = true;
    setBusy(true); setError('');
    const timer = setTimeout(() => {
      const request = tab === 'all' ? searchMusic(query, !query.trim() ? releaseId : undefined) : loadPersonalMusic(userId, tab);
      request.then(rows => {
        if (!active) return;
        const needle = query.trim().toLowerCase();
        setTracks(tab === 'all' ? rows : rows.filter(row => `${row.track_title} ${row.artist} ${row.release_title}`.toLowerCase().includes(needle)));
      }).catch(error => { if (active) setError(musicError(error)); }).finally(() => { if (active) setBusy(false); });
    }, query ? 240 : 0);
    return () => { active = false; clearTimeout(timer); };
  }, [visible, tab, query, releaseId, userId, retry]);
  const save = async (track: MusicTrack) => {
    if (savingId) return;
    setSavingId(track.track_id);
    try {
      const remove = saved.has(track.track_id);
      await rememberMusic(userId, 'saved', track, remove);
      setSaved(current => { const next = new Set(current); remove ? next.delete(track.track_id) : next.add(track.track_id); return next; });
      if (tab === 'saved') setRetry(value => value + 1);
    } catch (error) { setError(musicError(error)); } finally { setSavingId(null); }
  };
  const content = <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Pressable accessibilityLabel="Close sound picker" accessibilityRole="button" style={styles.scrim} onPress={onClose} />
      <View accessibilityViewIsModal style={[styles.sheet, { backgroundColor: colors.background, paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={[styles.handle, { backgroundColor: colors.controlBorder }]} />
        <View style={styles.heading}><Text style={[styles.title, { color: colors.text }]}>Add music</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Close sound picker" onPress={onClose} style={styles.icon}><MaterialIcons name="close" size={24} color={colors.text} /></Pressable>
        </View>
        <View style={[styles.search, { backgroundColor: colors.surfaceAlt }]}><MaterialIcons name="search" size={21} color={colors.textMuted} />
          <TextInput value={query} onChangeText={setQuery} placeholder="Search tracks, artists, releases" placeholderTextColor={colors.textMuted} accessibilityLabel="Search release music" autoCorrect={false} returnKeyType="search" style={[styles.searchInput, { color: colors.text }]} />
          {query ? <Pressable onPress={() => setQuery('')} accessibilityRole="button" accessibilityLabel="Clear music search" style={styles.icon}><MaterialIcons name="cancel" size={20} color={colors.textMuted} /></Pressable> : null}
        </View>
        <View style={styles.tabs}>{(['all', 'saved', 'recent'] as const).map(value => <Pressable key={value} accessibilityRole="tab" accessibilityState={{ selected: tab === value }}
          onPress={() => { setTab(value); setQuery(''); }} style={[styles.tab, { backgroundColor: tab === value ? colors.text : colors.surfaceAlt }]}>
          <Text style={[styles.tabText, { color: tab === value ? colors.background : colors.text }]}>{value === 'all' ? (releaseId && !query ? 'This release' : 'Discover') : value === 'saved' ? 'Saved' : 'Recent'}</Text>
        </Pressable>)}</View>
        {error ? <View style={styles.message}><Text accessibilityRole="alert" style={[styles.messageText, { color: colors.textSecondary }]}>{error}</Text><MusicButton label="Try again" onPress={() => setRetry(value => value + 1)} /></View> : null}
        {busy ? <ActivityIndicator style={{ padding: 32 }} color={colors.accentText} /> : <FlatList data={tracks} keyExtractor={item => item.track_id} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 18 }} ListEmptyComponent={<View style={styles.message}><MaterialIcons name="music-note" size={34} color={colors.textMuted} />
            <Text style={[styles.messageText, { color: colors.text }]}>{query ? 'No matching sounds' : tab === 'saved' ? 'Save sounds for your next post' : tab === 'recent' ? 'Your recent sounds will appear here' : 'No available sounds'}</Text>
            <Text style={[styles.meta, { color: colors.textMuted }]}>{query ? 'Try another track or artist.' : tab === 'saved' ? 'Tap the bookmark beside a sound.' : 'Public, streamable releases appear here.'}</Text>
          </View>}
          renderItem={({ item }) => {
            const active = item.track_id === auditionId;
            return <View style={[styles.row, { borderBottomColor: colors.divider, backgroundColor: selectedId === item.track_id ? colors.accentSoft : 'transparent' }]}>
              <Pressable accessibilityRole="button" accessibilityLabel={`${active ? 'Pause' : 'Preview'} ${item.track_title} by ${item.artist}`} onPress={() => onAudition(item)} style={styles.artButton}>
                <SoundArtwork track={item} size={54} />
                <View style={styles.playBadge}>{active && auditionBusy ? <ActivityIndicator size="small" color="#FFFFFF" /> : <MaterialIcons name={active ? 'pause' : 'play-arrow'} size={19} color="#FFFFFF" />}</View>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={`Use ${item.track_title} by ${item.artist}`} onPress={() => onSelect(item)} style={styles.copy}>
                <Text numberOfLines={1} style={[styles.trackTitle, { color: active || selectedId === item.track_id ? colors.accentText : colors.text }]}>{item.track_title}</Text>
                <Text numberOfLines={1} style={[styles.meta, { color: colors.textMuted }]}>{item.artist} · {item.duration ? formatMusicTime(item.duration) : item.release_title}</Text>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={`${saved.has(item.track_id) ? 'Unsave' : 'Save'} ${item.track_title}`} disabled={Boolean(savingId)} onPress={() => void save(item)} style={styles.icon}>
                {savingId === item.track_id ? <ActivityIndicator color={colors.accentText} /> : <MaterialIcons name={saved.has(item.track_id) ? 'bookmark' : 'bookmark-border'} size={24} color={saved.has(item.track_id) ? colors.accentText : colors.textSecondary} />}
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={`Select ${item.track_title}`} onPress={() => onSelect(item)} style={styles.icon}><MaterialIcons name="chevron-right" size={24} color={colors.textSecondary} /></Pressable>
            </View>;
          }} />}
        {tab !== 'all' ? <Text style={[styles.localNote, { color: colors.textMuted }]}>Sounds saved and played on this device</Text> : null}
      </View>
    </KeyboardAvoidingView>;
  return inline ? content : <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>{content}</Modal>;
}
const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' }, scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: { height: '72%', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20 },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 10 },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
  title: { fontFamily: pluggdFonts.satoshiBlack, fontSize: 24 }, icon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  search: { borderRadius: 16, flexDirection: 'row', alignItems: 'center', paddingLeft: 14, minHeight: 50 }, searchInput: { flex: 1, minWidth: 0, fontSize: 15, fontFamily: pluggdFonts.satoshiMedium, paddingHorizontal: 10, paddingVertical: 12 },
  tabs: { flexDirection: 'row', gap: 8, paddingVertical: 16 }, tab: { minHeight: 44, borderRadius: 22, paddingHorizontal: 18, justifyContent: 'center' }, tabText: { fontFamily: pluggdFonts.satoshiBold, fontSize: 13 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderRadius: 12 },
  artButton: { width: 54, height: 54 }, playBadge: { position: 'absolute', right: -3, bottom: -3, width: 27, height: 27, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.85)', alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, minWidth: 0, paddingLeft: 14, gap: 6, minHeight: 54, justifyContent: 'center' }, trackTitle: { fontFamily: pluggdFonts.satoshiBold, fontSize: 16 }, meta: { fontFamily: pluggdFonts.satoshiMedium, fontSize: 12, lineHeight: 18 },
  message: { alignItems: 'center', paddingVertical: 24, gap: 12 }, messageText: { fontFamily: pluggdFonts.satoshiMedium, fontSize: 15, textAlign: 'center' }, localNote: { fontFamily: pluggdFonts.satoshiMedium, fontSize: 11, textAlign: 'center', paddingTop: 8 },
});
