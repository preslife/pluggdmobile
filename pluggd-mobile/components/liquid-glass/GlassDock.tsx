import { MaterialIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
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
                <View style={[styles.iconShell, item.active && styles.iconShellActive]}>
                  <MaterialIcons
                    name={item.icon}
                    size={21}
                    color={item.active ? liquidGlassColors.accent : liquidGlassColors.textMuted}
                  />
                </View>
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

const styles = StyleSheet.create({
  wrap: {
    paddingTop: 6,
    paddingHorizontal: 20,
  },
  dockShell: {
    height: 58,
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
    width: 30,
    height: 27,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0,
  },
  iconShellActive: {
    backgroundColor: 'rgba(255,102,0,0.08)',
  },
  tabLabel: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 10,
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
