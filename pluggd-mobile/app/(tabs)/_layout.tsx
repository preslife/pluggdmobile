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
          name="stage"
          options={{
            title: "Stage",
          }}
        />
        <Tabs.Screen
          name="live"
          options={{
            title: "Live",
          }}
        />
        <Tabs.Screen
          name="backstage"
          options={{
            title: "Backstage",
          }}
        />
        <Tabs.Screen
          name="search"
          options={{
            title: "Search",
          }}
        />
        <Tabs.Screen
          name="explore"
          options={{
            title: "Discover",
            href: null,
          }}
        />
        <Tabs.Screen
          name="drops"
          options={{
            title: "Music",
            href: null,
          }}
        />
        <Tabs.Screen
          name="marketplace"
          options={{
            title: "Market",
            href: null,
          }}
        />
        <Tabs.Screen
          name="mixes"
          options={{
            title: "Mixes",
            href: null,
          }}
        />
        <Tabs.Screen
          name="events"
          options={{
            title: "Events",
            href: null,
          }}
        />
        <Tabs.Screen
          name="wallet"
          options={{
            title: "Wallet",
            href: null,
          }}
        />
        <Tabs.Screen
          name="social"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="community"
          options={{
            title: "Community",
            href: null,
          }}
        />
        <Tabs.Screen
          name="soundboards"
          options={{
            title: "Soundboards",
            href: null,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            href: null,
          }}
        />
      </Tabs>
    </View>
  );
}
