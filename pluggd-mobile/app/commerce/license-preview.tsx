
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { BrandLogo } from '../../components/BrandLogo';
import { SymbolIcon } from '../../components/SymbolIcon';

type LicenseClause = {
  number: string;
  title: string;
  body: string;
  bullets?: string[];
};

const CLAUSES: LicenseClause[] = [
  {
    number: '01',
    title: 'Grant of Rights',
    body: 'The Licensor hereby grants to Licensee an exclusive, non-transferable right to use the Beat in the creation of a new musical composition ("New Song"). The Licensee may distribute, perform, and broadcast the New Song worldwide without limitation on streams or sales units, subject to the terms herein.',
  },
  {
    number: '02',
    title: 'Royalties & Publishing',
    body: 'Licensee agrees to the following split of publishing rights:',
    bullets: [
      "50% to Licensor (Writer's Share)",
      "50% to Licensee (Writer's Share)",
    ],
  },
  {
    number: '03',
    title: 'Credit',
    body: 'Licensee shall credit the Licensor in all media where the New Song is displayed or listed as "Produced by DJ Producer". This credit must be included in the metadata of distributed files.',
  },
  {
    number: '04',
    title: 'Indemnification',
    body: 'Licensee agrees to indemnify and hold Licensor harmless from any and all claims, liabilities, damages, losses, or expenses arising from the use of the Beat.',
  },
];

export default function LicensePreview() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    title?: string;
    licenseType?: string;
    producer?: string;
    licensee?: string;
    agreementId?: string;
  }>();

  const title = params.title || 'Midnight City Vibes';
  const licenseType = params.licenseType || 'Exclusive Rights';
  const producer = params.producer || 'DJ Producer';
  const licensee = params.licensee || 'Lil Creator';
  const agreementId = params.agreementId || 'PID-98234-EX';

  return (
    <View className="flex-1 bg-background-light dark:bg-background-dark">
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header - orange bar */}
      <View className="flex-row items-center justify-between px-4 pt-14 pb-4 bg-primary">
        <TouchableOpacity
          onPress={() => router.back()}
          className="h-12 w-12 items-center justify-start"
        >
          <SymbolIcon name="arrow_back" className="text-[#181411]" style={{ fontSize: 28 }} />
        </TouchableOpacity>
        <Text className="text-[#181411] text-lg font-bold leading-tight tracking-tight uppercase flex-1 text-center">
          License Preview
        </Text>
        <View className="flex-row items-center gap-3">
          <TouchableOpacity>
            <SymbolIcon name="download" className="text-[#181411]" style={{ fontSize: 24 }} />
          </TouchableOpacity>
          <TouchableOpacity>
            <SymbolIcon name="ios_share" className="text-[#181411]" style={{ fontSize: 24 }} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1 p-4" contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Document Paper */}
        <View className="w-full bg-white rounded-lg overflow-hidden" style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.15,
          shadowRadius: 30,
          elevation: 10,
        }}>
          {/* Doc Header */}
          <View className="p-8 border-b border-gray-100">
            <View className="flex-row justify-between items-start mb-6">
              <View>
                <View className="mb-1">
                  <BrandLogo variant="light" width={112} height={36} />
                </View>
                <Text className="text-xs text-gray-500 font-medium uppercase tracking-wider">
                  Official License Document
                </Text>
              </View>
              <View className="bg-primary/10 border border-primary/20 px-2 py-1 rounded">
                <Text className="text-primary text-xs font-bold uppercase tracking-wide">{licenseType}</Text>
              </View>
            </View>
            <Text className="text-3xl font-bold text-black leading-tight mb-2">{title}</Text>
            <Text className="text-gray-500 text-sm">
              Agreement ID: <Text className="text-black" style={{ fontFamily: 'Courier' }}>{agreementId}</Text>
            </Text>
          </View>

          {/* Metadata Grid */}
          <View className="bg-gray-50 px-8 py-6 border-b border-gray-100">
            <View className="flex-row flex-wrap">
              {[
                { label: 'Effective Date', value: 'Oct 24, 2023' },
                { label: 'Producer (Licensor)', value: producer },
                { label: 'Licensee', value: licensee },
                { label: 'Format', value: 'WAV, MP3, Stems' },
              ].map((item, idx) => (
                <View key={item.label} className="w-1/2 mb-4">
                  <Text className="text-primary text-xs font-bold uppercase tracking-wide mb-1">{item.label}</Text>
                  <Text className="text-black text-sm font-medium">{item.value}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Legal Clauses */}
          <View className="p-8 gap-6">
            {CLAUSES.map((clause) => (
              <View key={clause.number}>
                <View className="flex-row items-center gap-2 mb-2">
                  <Text className="text-primary font-bold text-lg">{clause.number}.</Text>
                  <Text className="text-black font-bold text-lg">{clause.title}</Text>
                </View>
                <Text className="text-gray-700 text-sm leading-relaxed">{clause.body}</Text>
                {clause.bullets && (
                  <View className="mt-2 gap-1 pl-2">
                    {clause.bullets.map((b) => (
                      <Text key={b} className="text-gray-700 text-sm">
                        {'•'} {b}
                      </Text>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </View>

          {/* Signatures */}
          <View className="bg-gray-50 p-8 border-t border-gray-100">
            <View className="flex-row justify-between gap-8">
              <View className="flex-1">
                <View className="h-12 border-b-2 border-gray-300 mb-2 justify-end pb-1">
                  <Text className="text-2xl text-gray-600 italic" style={{ fontFamily: 'Georgia' }}>{licensee}</Text>
                </View>
                <Text className="text-xs text-gray-500 uppercase font-bold">Licensee Signature</Text>
              </View>
              <View className="flex-1">
                <View className="h-12 border-b-2 border-gray-300 mb-2 justify-end pb-1">
                  <Text className="text-2xl text-gray-600 italic" style={{ fontFamily: 'Georgia' }}>{producer}</Text>
                </View>
                <Text className="text-xs text-gray-500 uppercase font-bold">Licensor Signature</Text>
              </View>
            </View>

            <View className="mt-8 flex-row items-center justify-center gap-2" style={{ opacity: 0.5 }}>
              <SymbolIcon name="verified_user" className="text-gray-500" style={{ fontSize: 16 }} />
              <Text className="text-[10px] uppercase tracking-widest text-gray-500">Digitally Verified by Pluggd</Text>
            </View>
          </View>

          {/* Bottom orange bar */}
          <View className="h-2 bg-primary w-full" />
        </View>
      </ScrollView>

      {/* Floating Save Button */}
      <View className="absolute bottom-0 left-0 right-0 p-4 pb-8 bg-background-light/95 dark:bg-background-dark/95">
        <TouchableOpacity
          className="w-full bg-primary py-4 rounded-xl flex-row items-center justify-center gap-2"
          style={{
            shadowColor: '#FF5200',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 8,
          }}
        >
          <SymbolIcon name="folder_open" className="text-[#181411]" />
          <Text className="text-[#181411] text-base font-bold">Save to Files</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
