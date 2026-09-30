import { MaterialIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useAuth } from '../../context/AuthProvider';
import { pluggdFonts } from '../../design/typography';
import { usePluggdTheme } from '../../design/usePluggdTheme';
import { searchMusic } from './service';

export function ReleaseMusicAction({ releaseId }: { releaseId: string }) {
  const { user } = useAuth();
  const { colors } = usePluggdTheme();
  const router = useRouter();
  const tracks = useQuery({ queryKey: ['release-music', releaseId, user?.id], queryFn: () => searchMusic('', releaseId), enabled: Boolean(user), staleTime: 60_000 });
  if (!tracks.data?.length) return null;
  return <Pressable accessibilityRole="button" accessibilityLabel="Use audio from this release in a photo or video" onPress={() => router.push({ pathname: '/create-music-post', params: { releaseId } } as any)}
    style={{ minHeight: 64, flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 18, backgroundColor: colors.accentSoft, borderColor: colors.borderAccent, borderWidth: 1, gap: 14, marginTop: 12 }}>
    <MaterialIcons name="library-music" size={26} color={colors.accentText} /><View style={{ flex: 1, gap: 4 }}>
      <Text style={{ color: colors.text, fontFamily: pluggdFonts.satoshiBold, fontSize: 16 }}>Use this audio</Text><Text style={{ color: colors.textMuted, fontFamily: pluggdFonts.satoshiMedium, fontSize: 12 }}>Make a photo or video with this release</Text>
    </View><MaterialIcons name="chevron-right" size={24} color={colors.accentText} />
  </Pressable>;
}
