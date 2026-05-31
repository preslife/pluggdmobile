import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../context/AuthProvider';

const COLORS = {
  surface: '#12121A',
  border: '#262637',
  orange: '#FF5A00',
  white: '#FFFFFF',
  muted: '#8E8E9F',
};

export function CommunityComposer() {
  const router = useRouter();
  const { user } = useAuth();

  if (!user?.id) {
    return (
      <View style={styles.card}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>P</Text>
        </View>
        <View style={styles.copy}>
          <Text style={styles.title}>Join the conversation</Text>
          <Text style={styles.subtitle}>Sign in to post, reply, repost, save, or share into the community.</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Sign in to post" style={styles.button} onPress={() => router.push('/auth/login' as any)}>
          <Text style={styles.buttonText}>Sign in</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Start a post" style={styles.card} onPress={() => router.push('/create-post' as any)}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{user.email?.[0]?.toUpperCase() || 'P'}</Text>
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>Start a post</Text>
        <Text style={styles.subtitle}>Share a thought, release, beat, photo, poll, or thread.</Text>
      </View>
      <View style={styles.iconButton}>
        <MaterialIcons name="add" size={24} color={COLORS.white} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#1F1F2E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '900',
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '900',
  },
  subtitle: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
    marginTop: 3,
  },
  button: {
    minHeight: 36,
    borderRadius: 18,
    backgroundColor: COLORS.orange,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#08080C',
    fontSize: 12,
    fontWeight: '900',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
