import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthProvider';
import { GlassComposer } from '../../../components/liquid-glass';

export function CommunityComposer() {
  const router = useRouter();
  const { user } = useAuth();

  if (!user?.id) {
    return (
      <GlassComposer
        signedIn={false}
        placeholder="What's happening in your world?"
        ctaLabel="Sign in"
        accessibilityLabel="Sign in to post"
        style={{ marginHorizontal: 16 }}
        onPress={() => router.push('/auth/login' as any)}
      />
    );
  }

  return (
    <GlassComposer
      signedIn
      userName={user.email || 'PLUGGD'}
      placeholder="What's happening in your world?"
      ctaLabel="Post"
      accessibilityLabel="Start a post"
      style={{ marginHorizontal: 16 }}
      onPress={() => router.push('/create-post' as any)}
    />
  );
}
