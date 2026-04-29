/**
 * BeatLicenseButton — region-aware CTA for beat licensing.
 *
 * Three variants based on storefront:
 * - US: "Get License" → opens external web checkout
 * - Entitled: "Get License" → opens via entitlement flow
 * - Restricted: "Save Beat" / "Email Me Link" / license info display
 */
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useStorefront } from '../src/hooks/useStorefront';
import { supabase } from '../src/lib/supabase';

interface BeatLicenseButtonProps {
  beatId: string;
  beatTitle: string;
  producerName: string;
  licenseUrl?: string; // web checkout URL
  licenses?: { name: string; price: number }[];
  onSave?: () => void;
  compact?: boolean;
}

export default function BeatLicenseButton({
  beatId,
  beatTitle,
  producerName,
  licenseUrl,
  licenses,
  onSave,
  compact = false,
}: BeatLicenseButtonProps) {
  const { region, isUS, isEntitled, canShowExternalLink, loading } = useStorefront();
  const router = useRouter();

  // ── US / Entitled: External checkout link ──
  if (canShowExternalLink && licenseUrl) {
    return (
      <View>
        <TouchableOpacity
          onPress={() => {
            // Open in SFSafariViewController (via Linking for now)
            Linking.openURL(licenseUrl);
          }}
          className={`bg-[#FF5200] rounded-xl items-center justify-center flex-row gap-2 ${
            compact ? 'py-2.5 px-4' : 'py-3.5 px-6'
          }`}
        >
          <Text className="text-white text-base">📄</Text>
          <Text className="text-white font-bold">Get License</Text>
        </TouchableOpacity>

        {/* License tiers preview */}
        {!compact && licenses && licenses.length > 0 && (
          <View className="mt-2">
            {licenses.map((lic, i) => (
              <View
                key={i}
                className="flex-row justify-between items-center py-1.5"
              >
                <Text className="text-white/60 text-sm">{lic.name}</Text>
                <Text className="text-white font-semibold text-sm">
                  ${lic.price}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  }

  // ── Restricted: Fallback UI ──
  async function handleEmailLink() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        Alert.alert('Sign In', 'Please sign in to receive the license link.');
        return;
      }

      // Call edge function to email the license link
      const { error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          user_id: user.id,
          title: 'Beat License Link',
          body: `Here's your license link for "${beatTitle}" by ${producerName}`,
          data: {
            type: 'beat_license_link',
            beat_id: beatId,
            url: licenseUrl,
          },
        },
      });

      if (error) throw error;

      Alert.alert(
        'Link Sent!',
        'Check your email or notifications for the license link. You can complete the purchase on the web.',
      );
    } catch (err) {
      Alert.alert('Error', 'Failed to send license link. Please try again.');
    }
  }

  return (
    <View className={compact ? '' : 'gap-2'}>
      {/* Save Beat */}
      <TouchableOpacity
        onPress={onSave}
        className={`bg-white/10 border border-white/20 rounded-xl items-center justify-center flex-row gap-2 ${
          compact ? 'py-2.5 px-4' : 'py-3.5 px-6'
        }`}
      >
        <Text className="text-white text-base">💾</Text>
        <Text className="text-white font-bold">Save Beat</Text>
      </TouchableOpacity>

      {!compact && (
        <>
          {/* Email Me Link */}
          <TouchableOpacity
            onPress={handleEmailLink}
            className="bg-white/5 border border-white/10 rounded-xl py-3 items-center flex-row justify-center gap-2"
          >
            <Text className="text-white/70 text-base">✉️</Text>
            <Text className="text-white/70 font-medium text-sm">
              Email Me the License Link
            </Text>
          </TouchableOpacity>

          {/* License info (no purchase CTA) */}
          {licenses && licenses.length > 0 && (
            <View className="bg-white/5 rounded-xl p-4 mt-1">
              <Text className="text-white/50 text-xs mb-2 uppercase tracking-wider">
                License Options
              </Text>
              {licenses.map((lic, i) => (
                <View
                  key={i}
                  className="flex-row justify-between items-center py-1.5"
                >
                  <Text className="text-white/60 text-sm">{lic.name}</Text>
                  <Text className="text-white/40 text-sm">${lic.price}</Text>
                </View>
              ))}
              <Text className="text-white/30 text-xs mt-2">
                Licenses are completed on pluggd.com
              </Text>
            </View>
          )}
        </>
      )}
    </View>
  );
}
