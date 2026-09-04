import { MaterialIcons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { LEGAL_URLS, SUPPORT_EMAIL } from '../src/config/environment';
import { useAuth } from '../src/context/AuthProvider';
import { useBottomChromeInset } from '../src/design/useBottomChromeInset';
import { pluggdFonts } from '../src/design/typography';
import { usePluggdTheme } from '../src/design/usePluggdTheme';
import { supabase } from '../src/lib/supabase';

async function openSupportDestination(url: string) {
  try {
    const supported = await Linking.canOpenURL(url);
    if (!supported) throw new Error('unsupported');
    await Linking.openURL(url);
  } catch {
    Alert.alert('Could not open that link', `Email us directly at ${SUPPORT_EMAIL}.`);
  }
}

export default function SupportScreen() {
  const router = useRouter();
  const theme = usePluggdTheme();
  const { user } = useAuth();
  const bottomInset = useBottomChromeInset();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const emailUrl = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('PLUGGD support request')}`;
  const secondaryLinks = [
    { label: 'Help Centre', detail: 'Answers and ways to get help', url: LEGAL_URLS.support, icon: 'help-outline' as const },
    { label: 'Community Guidelines', detail: 'Safety, reporting and community standards', url: LEGAL_URLS.communityGuidelines, icon: 'verified-user' as const },
    { label: 'Privacy Policy', detail: 'How PLUGGD handles your information', url: LEGAL_URLS.privacy, icon: 'privacy-tip' as const },
    { label: 'Terms of Service', detail: 'The terms for using PLUGGD', url: LEGAL_URLS.terms, icon: 'description' as const },
  ];

  useEffect(() => {
    if (!user) return;
    setEmail((current) => current || user.email || '');
    setName((current) => current || String(user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || ''));
  }, [user]);

  const sendMessage = async () => {
    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanMessage = message.trim();
    if (cleanName.length < 2) {
      Alert.alert('Add your name', 'Enter the name PLUGGD Support should use when replying.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      Alert.alert('Check your email', 'Enter a valid email address so PLUGGD Support can reply.');
      return;
    }
    if (cleanMessage.length < 10) {
      Alert.alert('Tell us a little more', 'Your message must be at least 10 characters.');
      return;
    }

    setSending(true);
    try {
      const { error } = await (supabase as any).from('contact_messages').insert({
        name: cleanName,
        email: cleanEmail,
        subject: subject.trim() || 'PLUGGD app support request',
        message: cleanMessage,
      });
      if (error) throw error;
      setSubject('');
      setMessage('');
      Alert.alert('Message sent', `PLUGGD Support received your message and can reply to ${cleanEmail}.`);
    } catch {
      Alert.alert('Message not sent', `Please try again, or email us directly at ${SUPPORT_EMAIL}.`);
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottomInset }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/settings' as any))}
          style={[styles.backButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
        >
          <MaterialIcons name="arrow-back-ios-new" size={18} color={theme.colors.text} />
        </Pressable>

        <View style={styles.intro}>
          <Text style={[styles.eyebrow, { color: theme.colors.accentText }]}>HELP & CONTACT</Text>
          <Text style={[styles.title, { color: theme.colors.text }]}>We’re here when<Text style={{ color: theme.colors.accentText }}> you need us.</Text></Text>
          <Text style={[styles.lede, { color: theme.colors.textMuted }]}>Get help with account access, purchases, safety, privacy or anything that is not working as expected.</Text>
        </View>

        <View style={[styles.messageCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={styles.messageHeading}>
            <View style={[styles.contactIcon, { backgroundColor: theme.colors.accentSoft }]}>
              <MaterialIcons name="chat-bubble-outline" size={26} color={theme.colors.accentText} />
            </View>
            <View style={styles.messageHeadingCopy}>
              <Text style={[styles.messageTitle, { color: theme.colors.text }]}>Send us a message</Text>
              <Text style={[styles.messageSubtitle, { color: theme.colors.textMuted }]}>This goes directly to PLUGGD Support.</Text>
            </View>
          </View>
          <TextInput
            accessibilityLabel="Your name"
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            placeholderTextColor={theme.colors.textSubtle}
            autoCapitalize="words"
            style={[styles.input, { color: theme.colors.text, backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.border }]}
          />
          <TextInput
            accessibilityLabel="Your reply email"
            value={email}
            onChangeText={setEmail}
            placeholder="Email for our reply"
            placeholderTextColor={theme.colors.textSubtle}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
            style={[styles.input, { color: theme.colors.text, backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.border }]}
          />
          <TextInput
            accessibilityLabel="Support subject"
            value={subject}
            onChangeText={setSubject}
            placeholder="Subject (optional)"
            placeholderTextColor={theme.colors.textSubtle}
            style={[styles.input, { color: theme.colors.text, backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.border }]}
          />
          <TextInput
            accessibilityLabel="Support message"
            value={message}
            onChangeText={setMessage}
            placeholder="How can we help?"
            placeholderTextColor={theme.colors.textSubtle}
            multiline
            textAlignVertical="top"
            style={[styles.input, styles.messageInput, { color: theme.colors.text, backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.border }]}
          />
          <Text style={[styles.formNote, { color: theme.colors.textMuted }]}>Do not include passwords or payment details.</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={sending ? 'Sending support message' : 'Send message to PLUGGD Support'}
            accessibilityState={{ disabled: sending, busy: sending }}
            disabled={sending}
            onPress={() => void sendMessage()}
            style={[styles.primaryButton, { backgroundColor: theme.colors.accentFill, opacity: sending ? 0.65 : 1 }]}
          >
            {sending ? <ActivityIndicator color={theme.colors.onAccent} /> : <MaterialIcons name="send" size={20} color={theme.colors.onAccent} />}
            <Text style={[styles.primaryButtonText, { color: theme.colors.onAccent }]}>{sending ? 'Sending…' : 'Send message'}</Text>
          </Pressable>
        </View>

        <View style={[styles.contactCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Text style={[styles.contactLabel, { color: theme.colors.textMuted }]}>PREFER EMAIL?</Text>
          <Text accessibilityRole="link" onPress={() => void openSupportDestination(emailUrl)} style={[styles.email, { color: theme.colors.text }]}>{SUPPORT_EMAIL}</Text>
          <Text style={[styles.contactCopy, { color: theme.colors.textMuted }]}>Open your email app and contact the same support team directly.</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Email PLUGGD support at ${SUPPORT_EMAIL}`}
            onPress={() => void openSupportDestination(emailUrl)}
            style={[styles.primaryButton, { backgroundColor: theme.colors.accentFill }]}
          >
            <MaterialIcons name="mail-outline" size={20} color={theme.colors.onAccent} />
            <Text style={[styles.primaryButtonText, { color: theme.colors.onAccent }]}>Email support</Text>
          </Pressable>
        </View>

        <View style={styles.safetyNote}>
          <MaterialIcons name="shield" size={20} color={theme.colors.accentText} />
          <Text style={[styles.safetyCopy, { color: theme.colors.textSecondary }]}>For harmful content or behaviour, use Report or Block where it appears, then contact us if you need more help.</Text>
        </View>

        <Text style={[styles.sectionTitle, { color: theme.colors.textSubtle }]}>MORE HELP</Text>
        <View style={[styles.linkList, { borderTopColor: theme.colors.border }]}>
          {secondaryLinks.map((item) => (
            <Pressable
              key={item.label}
              accessibilityRole="link"
              accessibilityLabel={`${item.label}. ${item.detail}`}
              onPress={() => void openSupportDestination(item.url)}
              style={[styles.linkRow, { borderBottomColor: theme.colors.border }]}
            >
              <View style={[styles.linkIcon, { backgroundColor: theme.colors.surfaceAlt }]}>
                <MaterialIcons name={item.icon} size={21} color={theme.colors.accentText} />
              </View>
              <View style={styles.linkCopy}>
                <Text style={[styles.linkLabel, { color: theme.colors.text }]}>{item.label}</Text>
                <Text style={[styles.linkDetail, { color: theme.colors.textMuted }]}>{item.detail}</Text>
              </View>
              <MaterialIcons name="north-east" size={19} color={theme.colors.textSubtle} />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 58, paddingBottom: 176 },
  backButton: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  intro: { marginTop: 28, maxWidth: 380 },
  eyebrow: { fontFamily: pluggdFonts.satoshiBlack, fontSize: 11, lineHeight: 14, letterSpacing: 1.8 },
  title: { marginTop: 9, fontFamily: pluggdFonts.displayExtraBold, fontSize: 35, lineHeight: 39, letterSpacing: -1 },
  lede: { marginTop: 10, fontFamily: pluggdFonts.satoshiMedium, fontSize: 15, lineHeight: 22 },
  messageCard: { marginTop: 28, borderWidth: 1, borderRadius: 20, padding: 18, gap: 11 },
  messageHeading: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  messageHeadingCopy: { flex: 1, minWidth: 0 },
  messageTitle: { fontFamily: pluggdFonts.displayBold, fontSize: 20, lineHeight: 25 },
  messageSubtitle: { marginTop: 2, fontFamily: pluggdFonts.satoshiMedium, fontSize: 12, lineHeight: 17 },
  input: { minHeight: 50, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, fontFamily: pluggdFonts.satoshiMedium, fontSize: 14 },
  messageInput: { minHeight: 126, paddingTop: 14, paddingBottom: 14 },
  formNote: { fontFamily: pluggdFonts.satoshiMedium, fontSize: 11, lineHeight: 16 },
  contactCard: { marginTop: 28, borderWidth: 1, borderRadius: 20, padding: 20 },
  contactIcon: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  contactLabel: { marginTop: 22, fontFamily: pluggdFonts.satoshiBlack, fontSize: 10, letterSpacing: 1.4 },
  email: { marginTop: 7, fontFamily: pluggdFonts.displayBold, fontSize: 21, lineHeight: 27, textDecorationLine: 'underline' },
  contactCopy: { marginTop: 10, fontFamily: pluggdFonts.satoshiMedium, fontSize: 13, lineHeight: 19 },
  primaryButton: { minHeight: 54, marginTop: 20, borderRadius: 999, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, paddingHorizontal: 20 },
  primaryButtonText: { fontFamily: pluggdFonts.satoshiBlack, fontSize: 14 },
  safetyNote: { marginTop: 18, flexDirection: 'row', alignItems: 'flex-start', gap: 11, paddingHorizontal: 4 },
  safetyCopy: { flex: 1, fontFamily: pluggdFonts.satoshiMedium, fontSize: 13, lineHeight: 19 },
  sectionTitle: { marginTop: 34, marginBottom: 10, fontFamily: pluggdFonts.satoshiBlack, fontSize: 10, letterSpacing: 1.7 },
  linkList: { borderTopWidth: StyleSheet.hairlineWidth },
  linkRow: { minHeight: 74, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  linkIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  linkCopy: { flex: 1, minWidth: 0 },
  linkLabel: { fontFamily: pluggdFonts.satoshiBold, fontSize: 15 },
  linkDetail: { marginTop: 3, fontFamily: pluggdFonts.satoshiMedium, fontSize: 12, lineHeight: 17 },
});
