import { MaterialIcons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { impactHaptic } from '../../src/design/haptics';
import { createMobilePlaylist } from '../../src/features/culture/mobileServices';
import { PLUGGD_ORANGE } from '../../src/lib/mobileContent';
import { useState } from 'react';

export default function NewPlaylistRoute() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const mutation = useMutation({
    mutationFn: () => createMobilePlaylist(name, description),
    onSuccess: (result) => {
      if (!result.success || !result.playlist) {
        Alert.alert('Playlist unavailable', result.error || 'Playlist creation is not available right now.');
        return;
      }
      impactHaptic();
      void queryClient.invalidateQueries({ queryKey: ['culture', 'library'] });
      void queryClient.invalidateQueries({ queryKey: ['culture', 'playlists'] });
      router.replace(result.playlist.route as any);
    },
    onError: (error) => Alert.alert('Playlist unavailable', error instanceof Error ? error.message : String(error)),
  });

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar style="light" />
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" style={styles.iconButton} onPress={() => router.back()}>
          <MaterialIcons name="chevron-left" size={28} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.headerTitle}>NEW PLAYLIST</Text>
        <View style={styles.iconButton} />
      </View>

      <View style={styles.content}>
        <Text style={styles.kicker}>LIBRARY</Text>
        <Text style={styles.title}>Create a playlist</Text>
        <Text style={styles.body}>Build a private playlist first. You can add tracks from the player, releases, search and playlist detail once it exists.</Text>

        <View style={styles.form}>
          <Text style={styles.label}>Name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Late night garage"
            placeholderTextColor="#62627A"
            style={styles.input}
            autoCapitalize="words"
            maxLength={80}
          />
          <Text style={styles.label}>Description</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="What this playlist is for..."
            placeholderTextColor="#62627A"
            style={[styles.input, styles.textArea]}
            multiline
            maxLength={240}
          />
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Create playlist"
          disabled={mutation.isPending || !name.trim()}
          style={[styles.primaryButton, (!name.trim() || mutation.isPending) && styles.disabled]}
          onPress={() => mutation.mutate()}
        >
          <Text style={styles.primaryText}>{mutation.isPending ? 'Creating...' : 'Create Playlist'}</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#08080C' },
  header: { height: 92, paddingHorizontal: 16, paddingTop: 32, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#1F1F2E' },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#FFFFFF', fontFamily: 'PluggdSans5-Regular', fontSize: 28, lineHeight: 32 },
  content: { flex: 1, padding: 16, paddingTop: 26 },
  kicker: { color: PLUGGD_ORANGE, fontFamily: 'Satoshi-Black', fontSize: 12, letterSpacing: 1.1 },
  title: { color: '#FFFFFF', fontFamily: 'Satoshi-Black', fontSize: 32, lineHeight: 36, marginTop: 8 },
  body: { color: '#B3B3B3', fontSize: 15, lineHeight: 22, marginTop: 8 },
  form: { marginTop: 28, gap: 10 },
  label: { color: '#8E8E9F', fontFamily: 'Satoshi-Bold', fontSize: 13, textTransform: 'uppercase' },
  input: { minHeight: 52, borderRadius: 16, borderWidth: 1, borderColor: '#262626', backgroundColor: '#12121A', color: '#FFFFFF', paddingHorizontal: 14, fontSize: 16 },
  textArea: { minHeight: 116, paddingTop: 14, textAlignVertical: 'top' },
  primaryButton: { minHeight: 52, borderRadius: 26, backgroundColor: PLUGGD_ORANGE, alignItems: 'center', justifyContent: 'center', marginTop: 26 },
  primaryText: { color: '#08080C', fontFamily: 'Satoshi-Bold', fontSize: 15, textTransform: 'uppercase' },
  disabled: { opacity: 0.48 },
});
