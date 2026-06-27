import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Platform, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { selectionHaptic } from '../../src/design/haptics';
import { liquidGlassColors, liquidGlassRadii } from '../../src/design/liquidGlassTokens';
import { GlassPanel } from './GlassPanel';
import { LiftSurface } from './LiftSurface';

export type GlassDockItem = {
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  active?: boolean;
  onPress: () => void;
};

type GlassDockProps = {
  items: GlassDockItem[];
  bottomInset?: number;
};

export function GlassDock({ items, bottomInset = 10 }: GlassDockProps) {
  return (
    <View style={[styles.wrap, { paddingBottom: bottomInset }]}>
      <LiftSurface depth="normal">
        <GlassPanel intensity="subtle" radius={liquidGlassRadii.xxl} style={styles.dock} contentStyle={styles.tabRow}>
          {items.map((item) => (
            <Pressable
              key={item.label}
              accessibilityRole="tab"
              accessibilityLabel={`${item.label} tab`}
              accessibilityState={{ selected: !!item.active }}
              onPress={() => {
                selectionHaptic();
                item.onPress();
              }}
              style={({ pressed }) => [styles.tabPressable, pressed && styles.tabPressed]}
            >
              <View style={styles.tabItem}>
                <LinearGradient
                  colors={
                    item.active
                      ? ['rgba(255,255,255,0.30)', 'rgba(154,140,255,0.20)', 'rgba(10,12,24,0.55)']
                      : ['rgba(255,255,255,0.14)', 'rgba(255,255,255,0.04)', 'rgba(0,0,0,0.26)']
                  }
                  start={{ x: 0.32, y: 0.18 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.iconShell, webOrbLift, item.active && styles.iconShellActive]}
                >
                  <View pointerEvents="none" style={styles.iconOrbHighlight} />
                  <MaterialIcons
                    name={item.icon}
                    size={15}
                    color={item.active ? liquidGlassColors.textPrimary : liquidGlassColors.textMuted}
                  />
                </LinearGradient>
                {item.active ? <View style={styles.activeOrbDot} /> : null}
                <Text
                  style={[styles.tabLabel, { color: item.active ? liquidGlassColors.textPrimary : liquidGlassColors.textMuted }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.78}
                >
                  {item.label}
                </Text>
                <View style={[styles.activeIndicator, item.active && styles.activeIndicatorOn]} />
              </View>
            </Pressable>
          ))}
        </GlassPanel>
      </LiftSurface>
    </View>
  );
}

const webOrbLift = Platform.select({
  web: {
    filter: 'drop-shadow(0px 1px 1px rgba(0,0,0,0.78)) drop-shadow(0px 7px 12px rgba(0,0,0,0.42))',
  },
  default: {},
}) as ViewStyle;

const styles = StyleSheet.create({
  wrap: {
    paddingTop: 6,
    paddingHorizontal: 28,
  },
  dock: {
    minHeight: 58,
    shadowColor: '#000',
    shadowOpacity: 0.68,
    shadowRadius: 42,
    shadowOffset: { width: 0, height: 22 },
  },
  tabRow: {
    height: 58,
    paddingHorizontal: 7,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 2,
  },
  tabPressable: {
    flex: 1,
    height: 48,
  },
  tabPressed: {
    transform: [{ scale: 0.985 }],
    opacity: 0.86,
  },
  tabItem: {
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  iconShell: {
    width: 31,
    height: 31,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#000',
    shadowOpacity: 0.46,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 9 },
    overflow: 'hidden',
  },
  iconShellActive: {
    borderColor: 'rgba(255,255,255,0.20)',
    shadowColor: '#A091FF',
    shadowOpacity: 0.48,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 11 },
  },
  iconOrbHighlight: {
    position: 'absolute',
    left: 6,
    top: 4,
    width: 10,
    height: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.24)',
  },
  activeOrbDot: {
    position: 'absolute',
    top: 31,
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: liquidGlassColors.accent,
    shadowColor: liquidGlassColors.accent,
    shadowOpacity: 0.9,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  tabLabel: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 9.5,
    lineHeight: 12,
  },
  activeIndicator: {
    width: 0,
    height: 0,
    borderRadius: 0,
    backgroundColor: 'transparent',
  },
  activeIndicatorOn: {
    backgroundColor: 'transparent',
  },
});
