import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C } from "../../constants/theme";

type TabIconProps = {
  name: keyof typeof Ionicons.glyphMap;
  focusedName: keyof typeof Ionicons.glyphMap;
  size?: number;
  color: string;
  focused: boolean;
};

function TabIcon({ name, focusedName, size = 23, color, focused }: TabIconProps) {
  return (
    <View
      style={{
        backgroundColor: focused ? C.VIOLET_SUBTLE : "transparent",
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 5,
        alignItems: "center",
        justifyContent: "center",
        minWidth: 44,
      }}
    >
      <Ionicons name={focused ? focusedName : name} size={size} color={color} />
    </View>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopColor: "#E7E9F0",
          borderTopWidth: 1,
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom + 6,
          paddingTop: 6,
          elevation: 20,
          shadowColor: "#6D4AFF",
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.08,
          shadowRadius: 16,
        },
        tabBarActiveTintColor: C.VIOLET_PRIMARY,
        tabBarInactiveTintColor: C.TEXT_TERTIARY,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "600",
          marginTop: 1,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Inicio",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="home-outline" focusedName="home" color={color} focused={focused} />
          ),
        }}
      />

      <Tabs.Screen
        name="movements"
        options={{
          title: "Pagos",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="receipt-outline" focusedName="receipt" color={color} focused={focused} />
          ),
        }}
      />

      <Tabs.Screen
        name="qr"
        options={{
          title: "QR",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="qr-code-outline" focusedName="qr-code" size={24} color={color} focused={focused} />
          ),
        }}
      />

      <Tabs.Screen
        name="stats"
        options={{
          title: "Stats",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="bar-chart-outline" focusedName="bar-chart" color={color} focused={focused} />
          ),
        }}
      />

      <Tabs.Screen
        name="settings"
        options={{
          title: "Ajustes",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="settings-outline" focusedName="settings" color={color} focused={focused} />
          ),
        }}
      />

      {/* Hidden tabs — not in navigation bar */}
      <Tabs.Screen name="index"              options={{ href: null }} />
      <Tabs.Screen name="login"              options={{ href: null }} />
      <Tabs.Screen name="explore"            options={{ href: null }} />
      <Tabs.Screen name="settings/bank"      options={{ href: null }} />
      <Tabs.Screen name="settings/employees" options={{ href: null }} />
      <Tabs.Screen name="settings/tip-config" options={{ href: null }} />
    </Tabs>
  );
}
