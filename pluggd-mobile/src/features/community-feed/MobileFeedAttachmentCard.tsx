import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { PluggdImage } from '../../components/PluggdImage';
import type { MobileFeedAttachment } from './communityFeedTypes';

const COLORS = {
  surface: '#151520',
  border: '#2A2A38',
  orange: '#FF5A00',
  white: '#FFFFFF',
  muted: '#8E8E9F',
};

function labelForType(type: MobileFeedAttachment['type']) {
  if (type === 'release') return 'Release';
  if (type === 'beat') return 'Beat';
  if (type === 'gallery') return 'Gallery';
  if (type === 'mix') return 'Mix';
  return 'Event';
}

export function MobileFeedAttachmentCard({ attachment }: { attachment: MobileFeedAttachment }) {
  const router = useRouter();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open attached ${labelForType(attachment.type)}`}
      style={styles.card}
      onPress={() => router.push(attachment.route as any)}
    >
      {attachment.imageUrl ? (
        <PluggdImage uri={attachment.imageUrl} style={styles.image} resizeMode="cover" />
      ) : (
        <View style={styles.imageFallback}>
          <MaterialIcons name={attachment.type === 'beat' ? 'headphones' : attachment.type === 'event' ? 'event' : 'music-note'} size={24} color={COLORS.orange} />
        </View>
      )}
      <View style={styles.copy}>
        <Text style={styles.eyebrow}>{labelForType(attachment.type)}</Text>
        <Text style={styles.title} numberOfLines={2}>{attachment.title}</Text>
        <Text style={styles.subtitle} numberOfLines={2}>{attachment.subtitle}</Text>
      </View>
      <MaterialIcons name="arrow-forward" size={20} color={COLORS.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  image: {
    width: 64,
    height: 64,
    borderRadius: 14,
    backgroundColor: '#1F1F2E',
  },
  imageFallback: {
    width: 64,
    height: 64,
    borderRadius: 14,
    backgroundColor: '#1F1F2E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  eyebrow: {
    color: COLORS.orange,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: {
    color: COLORS.white,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '900',
    marginTop: 3,
  },
  subtitle: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    marginTop: 3,
  },
});
