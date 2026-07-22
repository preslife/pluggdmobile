import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthProvider';
import { MaterialIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { pluggdFonts } from '../../design/typography';

export function CommunityComposer() {
  const router = useRouter();
  const { user } = useAuth();

  const signedIn = Boolean(user?.id);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={signedIn ? 'Start a post' : 'Sign in to post'}
      style={styles.composer}
      onPress={() => router.push(signedIn ? '/create-post' as any : '/auth/login' as any)}
    >
      <View style={styles.icon}><MaterialIcons name={signedIn ? 'edit' : 'lock-outline'} size={19} color="#ff6600" /></View>
      <View style={styles.copy}>
        <Text style={styles.eyebrow}>{signedIn ? 'ADD TO THE SIGNAL' : 'JOIN THE CONVERSATION'}</Text>
        <Text style={styles.prompt} numberOfLines={1}>{signedIn ? "What's happening in your world?" : 'Sign in to post, react and follow scenes.'}</Text>
      </View>
      <MaterialIcons name="arrow-forward" size={20} color="#FFFFFF" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  composer: { minHeight: 64, marginHorizontal: 20, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#332A23', flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 10 },
  icon: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,102,0,0.1)', alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, minWidth: 0, gap: 2 },
  eyebrow: { color: '#ff6600', fontFamily: pluggdFonts.satoshiBlack, fontSize: 9, letterSpacing: 1.1 },
  prompt: { color: '#DAD5D0', fontFamily: pluggdFonts.satoshiBold, fontSize: 13 },
});
