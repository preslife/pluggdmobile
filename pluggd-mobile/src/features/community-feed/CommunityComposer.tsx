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
        placeholder="Sign in to post"
        ctaLabel="Sign in"
        style={{ marginHorizontal: 16 }}
        onPress={() => router.push('/auth/login' as any)}
      />
    );
  }

  return (
    <GlassComposer
      signedIn
      userName={user.email || 'PLUGGD'}
      placeholder="Start a post"
      style={{ marginHorizontal: 16 }}
      onPress={() => router.push('/create-post' as any)}
    />
  );
}
