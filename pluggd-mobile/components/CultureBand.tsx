import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { selectionHaptic } from '../src/design/haptics';
import { pluggdFonts } from '../src/design/typography';
import { EditorialTitle } from './EditorialTitle';

const ORANGE = '#FF5A00';

/**
 * Closing "Embody the culture" band — mobile port of NewHome2's final culture
 * band. A dark, orange-lit editorial sign-off that ends the home like the web:
 * a manifesto headline and two entry points into live + drops.
 */
export function CultureBand({ onEnterLive, onExploreDrops }: { onEnterLive: () => void; onExploreDrops: () => void }) {
  return (
    <View style={styles.band}>
      <LinearGradient
        colors={['#1A0E06', '#0C0A07']}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* orange horizon glow */}
      <View pointerEvents="none" style={styles.glow}>
        <LinearGradient colors={['rgba(255,90,0,0.34)', 'rgba(255,90,0,0)']} start={{ x: 0.5, y: 1 }} end={{ x: 0.5, y: 0 }} style={StyleSheet.absoluteFill} />
      </View>

      <Text style={styles.kicker}>Join the culture</Text>
      <EditorialTitle segments={[{ text: 'Embody the ' }, { text: 'culture', accent: true }]} size={30} lineHeight={33} color="#FFFFFF" accentColor={ORANGE} style={styles.line} />
      <EditorialTitle segments={[{ text: 'Fuel your ' }, { text: 'path', accent: true }]} size={30} lineHeight={33} color="#FFFFFF" accentColor={ORANGE} style={styles.line} />
      <Text style={styles.body}>
        Join the rooms where music starts, follow the scenes before they break, and build your world on PLUGGD.
      </Text>

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Enter live rooms"
          onPress={() => {
            selectionHaptic();
            onEnterLive();
          }}
          style={({ pressed }) => pressed && styles.pressed}
        >
          <View style={styles.primary}>
            <MaterialIcons name="sensors" size={17} color="#0E0E12" />
            <Text style={styles.primaryText}>Enter live rooms</Text>
          </View>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Explore drops"
          onPress={() => {
            selectionHaptic();
            onExploreDrops();
          }}
          style={({ pressed }) => pressed && styles.pressed}
        >
          <View style={styles.secondary}>
            <Text style={styles.secondaryText}>Explore drops</Text>
            <MaterialIcons name="arrow-forward" size={16} color="#FFFFFF" />
          </View>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  band: {
    borderRadius: 26,
    overflow: 'hidden',
    padding: 24,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,90,0,0.28)',
  },
  glow: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '70%' },
  kicker: { color: ORANGE, fontFamily: pluggdFonts.satoshiBlack, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 10 },
  line: { marginBottom: 0 },
  body: { color: 'rgba(255,255,255,0.78)', fontFamily: pluggdFonts.satoshiMedium, fontSize: 13.5, lineHeight: 20, marginTop: 12, maxWidth: '96%' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 20 },
  primary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 13,
  },
  primaryText: { color: '#0E0E12', fontFamily: pluggdFonts.satoshiBlack, fontSize: 13.5 },
  secondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: 18,
    paddingVertical: 13,
  },
  secondaryText: { color: '#FFFFFF', fontFamily: pluggdFonts.satoshiBold, fontSize: 13.5 },
  pressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
});

export default CultureBand;
