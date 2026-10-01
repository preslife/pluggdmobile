import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { pluggdFonts } from '../../design/typography';
import { usePluggdTheme } from '../../design/usePluggdTheme';
import type { PostMusic } from './model';

export function PostMusicAttribution({ music }: { music?: PostMusic }) {
  const { colors } = usePluggdTheme();
  const router = useRouter();
  if (!music) return null;
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, backgroundColor: colors.surfaceAlt, borderRadius: 14, paddingLeft: 12, paddingRight: 4 }}>
    <MaterialIcons name="music-note" size={20} color={colors.accentText} />
    <Pressable accessibilityRole="button" accessibilityLabel={`Open ${music.release_title}, soundtrack ${music.track_title} by ${music.artist}`} onPress={() => router.push(`/release/${music.release_id}` as any)} style={{ flex: 1, minWidth: 0, minHeight: 48, justifyContent: 'center', gap: 3 }}>
      <Text numberOfLines={1} style={{ fontFamily: pluggdFonts.satoshiBold, fontSize: 12, color: colors.text }}>{music.track_title}</Text><Text numberOfLines={1} style={{ fontFamily: pluggdFonts.satoshiMedium, fontSize: 11, color: colors.textMuted }}>{music.artist}</Text>
    </Pressable>
    {music.can_reuse ? <Pressable accessibilityRole="button" accessibilityLabel={`Use ${music.track_title} in your own post`} onPress={() => router.push({ pathname: '/create-music-post', params: { releaseId: music.release_id, trackId: music.track_id } } as any)} style={{ minHeight: 44, paddingHorizontal: 10, justifyContent: 'center' }}><Text style={{ fontFamily: pluggdFonts.satoshiBold, color: colors.accentText, fontSize: 12 }}>Use audio</Text></Pressable> : null}
  </View>;
}
