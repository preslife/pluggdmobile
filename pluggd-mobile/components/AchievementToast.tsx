
import { View, Text, TouchableOpacity, Modal } from 'react-native';

type AchievementToastProps = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  xp?: number;
  onShare?: () => void;
};

export default function AchievementToast({
  visible,
  onClose,
  title = 'Super Fan',
  description = 'You listened to 100 hours of indie tracks this month.',
  xp = 250,
  onShare,
}: AchievementToastProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View className="flex-1 items-center justify-center bg-black/80">
        {/* Glow background */}
        <View className="absolute w-full h-full items-center justify-center">
          <View className="w-80 h-80 rounded-full bg-primary/15 absolute" />
        </View>

        <View className="w-full max-w-[340px] px-6 items-center z-10">
          {/* Achievement Label */}
          <Text className="text-primary/90 text-xs font-bold tracking-widest uppercase text-center mb-8">
            Achievement Unlocked
          </Text>

          {/* Badge */}
          <View className="relative items-center justify-center mb-6">
            {/* Glow */}
            <View className="absolute w-32 h-32 rounded-full bg-primary opacity-40" />
            {/* Badge Circle */}
            <View
              className="relative w-32 h-32 rounded-full bg-[#2a1f15] border border-primary/30 items-center justify-center"
              style={{
                shadowColor: '#FF5200',
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.5,
                shadowRadius: 20,
              }}
            >
              <Text className="material-symbols-outlined text-primary" style={{ fontSize: 64 }}>headphones</Text>
              {/* Decorative stars */}
              <Text className="material-symbols-outlined text-primary text-2xl absolute -top-2 -right-2">star</Text>
              <Text className="material-symbols-outlined text-primary text-xl absolute bottom-2 -left-2">star</Text>
            </View>
          </View>

          {/* Title & Description */}
          <View className="items-center gap-2 mb-6">
            <Text className="text-white text-4xl font-bold tracking-tight leading-tight">{title}</Text>
            <Text className="text-white/70 text-base text-center leading-relaxed max-w-[280px]">
              {description}
            </Text>
          </View>

          {/* XP Chip */}
          <View className="mb-10">
            <View className="flex-row h-9 items-center gap-2 rounded-full bg-white/10 border border-white/10 px-4">
              <View className="w-5 h-5 rounded-full bg-primary items-center justify-center">
                <Text className="material-symbols-outlined text-white" style={{ fontSize: 14 }}>bolt</Text>
              </View>
              <Text className="text-white text-sm font-bold tracking-wide">+ {xp} XP</Text>
            </View>
          </View>

          {/* Actions */}
          <View className="w-full gap-3">
            <TouchableOpacity
              onPress={onShare || onClose}
              className="w-full flex-row items-center justify-center gap-2 rounded-full bg-primary py-4 px-6"
              style={{
                shadowColor: '#FF5200',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 8,
              }}
            >
              <Text className="material-symbols-outlined text-white" style={{ fontSize: 20 }}>ios_share</Text>
              <Text className="text-white text-base font-bold tracking-wide">Share to Community</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={onClose} className="w-full items-center justify-center py-3">
              <Text className="text-white/50 text-sm font-medium tracking-wide">Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
