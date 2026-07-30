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
        <View style={styles.dockShell}>
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            <GlassPanel intensity="subtle" radius={liquidGlassRadii.xxl} style={styles.dock} />
          </View>
          <View style={styles.tabRow}>
          {items.map((item) => (
            <Pressable
              key={item.label}
              accessible
              focusable
              collapsable={false}
              accessibilityRole="button"
              accessibilityLabel={`${item.label} tab`}
              accessibilityState={{ selected: !!item.active }}
              importantForAccessibility="yes"
              testID={`dock-tab-${item.label.toLowerCase()}`}
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
                      ? ['rgba(255,255,255,0.28)', 'rgba(255,102,0,0.22)', 'rgba(20,12,6,0.56)']
                      : ['rgba(255,255,255,0.13)', 'rgba(255,255,255,0.035)', 'rgba(0,0,0,0.28)']
                  }
                  start={{ x: 0.3, y: 0.12 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.iconShell, webOrbLift, item.active && styles.iconShellActive]}
                >
                  <View pointerEvents="none" style={styles.iconOrbHighlight} />
                  <MaterialIcons
                    name={item.icon}
                    size={20}
                    color={item.active ? liquidGlassColors.textPrimary : liquidGlassColors.textMuted}
                  />
                </LinearGradient>
                {item.active ? <View style={styles.activeOrbDot} /> : null}
                <Text
                  style={[styles.tabLabel, { color: item.active ? liquidGlassColors.textPrimary : liquidGlassColors.textMuted }]}
                  numberOfLines={1}
                  maxFontSizeMultiplier={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.78}
                >
                  {item.label}
                </Text>
                <View style={[styles.activeIndicator, item.active && styles.activeIndicatorOn]} />
              </View>
            </Pressable>
          ))}
          </View>
        </View>
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
    paddingTop: 5,
    paddingHorizontal: 16,
  },
  dockShell: {
    height: 60,
  },
  dock: {
    width: '100%',
    height: '100%',
    shadowColor: '#000',
    shadowOpacity: 0.68,
    shadowRadius: 42,
    shadowOffset: { width: 0, height: 22 },
  },
  tabRow: {
    height: 60,
    paddingHorizontal: 7,
    paddingVertical: 3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 2,
  },
  tabPressable: {
    flex: 1,
    height: 54,
  },
  tabPressed: {
    transform: [{ scale: 0.985 }],
    opacity: 0.86,
  },
  tabItem: {
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  iconShell: {
    width: 36,
    height: 30,
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
    borderColor: 'rgba(255,255,255,0.22)',
    shadowColor: liquidGlassColors.accent,
    shadowOpacity: 0.5,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
  },
  iconOrbHighlight: {
    position: 'absolute',
    left: 7,
    top: 4,
    width: 12,
    height: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  activeOrbDot: {
    position: 'absolute',
    top: 32,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: liquidGlassColors.accent,
    shadowColor: liquidGlassColors.accent,
    shadowOpacity: 0.9,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  tabLabel: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 10.5,
    lineHeight: 13,
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
