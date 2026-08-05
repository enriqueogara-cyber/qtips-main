import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C, RADIUS, SHADOW } from "../../constants/theme";

// ─── Regular tab icon with active pill ───────────────────────────────────────

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
      style={[
        styles.tabIconWrap,
        focused && styles.tabIconWrapActive,
      ]}
    >
      <Ionicons name={focused ? focusedName : name} size={size} color={color} />
    </View>
  );
}

// ─── Special QR center button ─────────────────────────────────────────────────

type QRTabBtnProps = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onPress?: ((event: any) => void) | undefined;
  accessibilityState?: { selected?: boolean };
  children?: React.ReactNode;
};

function QRTabButton({ onPress, accessibilityState }: QRTabBtnProps) {
  const focused = accessibilityState?.selected ?? false;

  return (
    <Pressable
      onPress={onPress as () => void}
      style={styles.qrBtnOuter}
      accessibilityLabel="QR"
      accessibilityRole="button"
      accessibilityState={{ selected: focused }}
    >
      {({ pressed }) => (
        <View style={styles.qrBtnInner}>
          <View
            style={[
              styles.qrCircle,
              focused && styles.qrCircleFocused,
              pressed && styles.qrCirclePressed,
            ]}
          >
            <Ionicons name="qr-code" size={26} color="#FFFFFF" />
          </View>
          <Text style={[styles.qrLabel, focused && styles.qrLabelFocused]}>QR</Text>
        </View>
      )}
    </Pressable>
  );
}

// ─── Layout ───────────────────────────────────────────────────────────────────

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopColor: C.BORDER,
          borderTopWidth: 1,
          height: 62 + insets.bottom,
          paddingBottom: insets.bottom + 6,
          paddingTop: 6,
          elevation: 20,
          shadowColor: "#6C4DFF",
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.07,
          shadowRadius: 20,
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
          title: "",
          tabBarButton: (props) => <QRTabButton {...props} />,
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
      <Tabs.Screen name="index"               options={{ href: null }} />
      <Tabs.Screen name="login"               options={{ href: null }} />
      <Tabs.Screen name="explore"             options={{ href: null }} />
      <Tabs.Screen name="settings/bank"       options={{ href: null }} />
      <Tabs.Screen name="settings/employees"  options={{ href: null }} />
      <Tabs.Screen name="settings/tip-config" options={{ href: null }} />
    </Tabs>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Regular tab icon
  tabIconWrap: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.sm,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 44,
  },
  tabIconWrapActive: {
    backgroundColor: C.VIOLET_SUBTLE,
  },

  // QR special button
  qrBtnOuter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  qrBtnInner: {
    alignItems: "center",
    gap: 3,
    marginTop: -8, // lift the circle slightly above the bar
  },
  qrCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: C.VIOLET_PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    ...SHADOW.violet,
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },
  qrCircleFocused: {
    backgroundColor: C.VIOLET_DARK,
  },
  qrCirclePressed: {
    transform: [{ scale: 0.93 }],
  },
  qrLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: C.TEXT_TERTIARY,
    marginTop: 1,
  },
  qrLabelFocused: {
    color: C.VIOLET_PRIMARY,
  },
});
