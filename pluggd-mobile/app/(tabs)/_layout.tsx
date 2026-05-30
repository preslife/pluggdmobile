import { Tabs } from "expo-router";
import { View } from "react-native";
import { usePluggdTheme } from "../../src/design/usePluggdTheme";

export default function TabLayout() {
  const theme = usePluggdTheme();

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            display: "none",
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
          }}
        />
        <Tabs.Screen
          name="discover"
          options={{
            title: "Discover",
          }}
        />
        <Tabs.Screen
          name="community"
          options={{
            title: "Community",
          }}
        />
        <Tabs.Screen
          name="events"
          options={{
            title: "Events",
          }}
        />
        <Tabs.Screen
          name="market"
          options={{
            title: "Market",
          }}
        />
        <Tabs.Screen name="explore" options={{ href: null }} />
        <Tabs.Screen name="create" options={{ href: null }} />
        <Tabs.Screen name="profile" options={{ href: null }} />
        <Tabs.Screen
          name="stage"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="live"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="backstage"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="my-pluggd"
          options={{
            href: null,
          }}
        />
      </Tabs>
    </View>
  );
}
