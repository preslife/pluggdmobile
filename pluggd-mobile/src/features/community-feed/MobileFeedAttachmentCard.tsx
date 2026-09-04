import { MaterialIcons } from '@expo/vector-icons';
import { pluggdFonts } from '../../design/typography';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { PluggdImage } from '../../components/PluggdImage';
import type { MobileFeedAttachment } from './communityFeedTypes';
import { usePluggdTheme } from '../../design/usePluggdTheme';

function labelForType(type: MobileFeedAttachment['type']) {
  if (type === 'release') return 'Release';
  if (type === 'beat') return 'Beat';
  if (type === 'gallery' || type === 'gallery_item') return 'Gallery';
  if (type === 'mix') return 'Mix';
  return 'Event';
}

export function MobileFeedAttachmentCard({ attachment }: { attachment: MobileFeedAttachment }) {
  const router = useRouter();
  const theme = usePluggdTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open attached ${labelForType(attachment.type)}`}
      style={[styles.card, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}
      onPress={() => router.push(attachment.route as any)}
    >
      {attachment.imageUrl ? (
        <PluggdImage uri={attachment.imageUrl} style={styles.image} resizeMode="cover" />
      ) : (
        <View style={[styles.imageFallback, { backgroundColor: theme.colors.artworkBase }]}>
          <MaterialIcons name={attachment.type === 'beat' ? 'headphones' : attachment.type === 'event' ? 'event' : attachment.type === 'gallery' || attachment.type === 'gallery_item' ? 'photo-library' : 'music-note'} size={24} color={theme.colors.accentText} />
        </View>
      )}
      <View style={styles.copy}>
        <Text style={[styles.eyebrow, { color: theme.colors.accentText }]}>{labelForType(attachment.type)}</Text>
        <Text style={[styles.title, { color: theme.colors.text }]} numberOfLines={2}>{attachment.title}</Text>
        <Text style={[styles.subtitle, { color: theme.colors.textMuted }]} numberOfLines={2}>{attachment.subtitle}</Text>
      </View>
      <MaterialIcons name="arrow-forward" size={20} color={theme.colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: 'transparent',
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  image: {
    width: 64,
    height: 64,
    borderRadius: 14,
    backgroundColor: 'transparent',
  },
  imageFallback: {
    width: 64,
    height: 64,
    borderRadius: 14,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  eyebrow: {
    color: 'transparent',
    fontSize: 10,
    fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: {
    color: 'transparent',
    fontSize: 14,
    lineHeight: 18,
    fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900',
    marginTop: 3,
  },
  subtitle: {
    color: 'transparent',
    fontSize: 12,
    lineHeight: 16,
    fontFamily: pluggdFonts.satoshiBold, fontWeight: '700',
    marginTop: 3,
  },
});
