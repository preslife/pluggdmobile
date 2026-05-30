import { Alert, Text, TouchableOpacity, View } from 'react-native';

interface BeatLicenseButtonProps {
  beatId: string;
  beatTitle: string;
  producerName: string;
  licenses?: { name: string; price: number }[];
  onSave?: () => void;
  compact?: boolean;
}

export default function BeatLicenseButton({
  beatTitle,
  producerName,
  licenses,
  onSave,
  compact = false,
}: BeatLicenseButtonProps) {
  const explainUnavailable = () => {
    Alert.alert(
      'Licensing coming soon',
      'Save this beat for now. Licensing options will appear here when this producer enables mobile licensing.',
    );
  };

  return (
    <View className={compact ? '' : 'gap-2'}>
      <TouchableOpacity
        onPress={onSave}
        className={`bg-white/10 border border-white/20 rounded-xl items-center justify-center ${
          compact ? 'py-2.5 px-4' : 'py-3.5 px-6'
        }`}
      >
        <Text className="text-white font-bold">Save Beat</Text>
      </TouchableOpacity>

      {!compact ? (
        <>
          <TouchableOpacity
            onPress={explainUnavailable}
            className="bg-white/5 border border-white/10 rounded-xl py-3 items-center justify-center"
          >
            <Text className="text-white/75 font-medium text-sm">
              Licensing coming soon
            </Text>
          </TouchableOpacity>

          {licenses && licenses.length > 0 ? (
            <View className="bg-white/5 rounded-xl p-4 mt-1">
              <Text className="text-white/50 text-xs mb-2 uppercase tracking-wider">
                License options
              </Text>
              {licenses.map((license) => (
                <View
                  key={`${beatTitle}-${producerName}-${license.name}`}
                  className="flex-row justify-between items-center py-1.5"
                >
                  <Text className="text-white/60 text-sm">{license.name}</Text>
                  <Text className="text-white/40 text-sm">${license.price}</Text>
                </View>
              ))}
              <Text className="text-white/30 text-xs mt-2">
                Save the beat and check back for mobile licensing.
              </Text>
            </View>
          ) : null}
        </>
      ) : null}
    </View>
  );
}
