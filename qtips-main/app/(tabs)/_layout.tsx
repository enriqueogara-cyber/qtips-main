import { Ionicons } from "@expo/vector-icons";
import { Tabs, usePathname, useRouter } from "expo-router";
import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C, RADIUS, SHADOW } from "../../constants/theme";

const DESKTOP_BREAKPOINT = 768;

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
    <View style={[styles.tabIconWrap, focused && styles.tabIconWrapActive]}>
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

// ─── Desktop sidebar ──────────────────────────────────────────────────────────

type SideItem = {
  route: string;
  tabName: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconFocused: keyof typeof Ionicons.glyphMap;
};

const SIDE_ITEMS: SideItem[] = [
  { route: "/home",      tabName: "home",      label: "Inicio",        icon: "home-outline",      iconFocused: "home"      },
  { route: "/movements", tabName: "movements", label: "Movimientos",   icon: "receipt-outline",   iconFocused: "receipt"   },
  { route: "/qr",        tabName: "qr",        label: "Código QR",     icon: "qr-code-outline",   iconFocused: "qr-code"   },
  { route: "/stats",     tabName: "stats",     label: "Estadísticas",  icon: "bar-chart-outline", iconFocused: "bar-chart" },
  { route: "/settings",  tabName: "settings",  label: "Ajustes",       icon: "settings-outline",  iconFocused: "settings"  },
];

function DesktopSidebar({ pathname }: { pathname: string }) {
  const router = useRouter();

  const isActive = (item: SideItem) =>
    pathname === item.route ||
    (item.tabName === "settings" && pathname.startsWith("/settings"));

  return (
    <View style={sb.sidebar}>
      {/* Logo */}
      <View style={sb.logoArea}>
        <View style={sb.logoMark}>
          <Ionicons name="cash-outline" size={18} color="#FFFFFF" />
        </View>
        <Text style={sb.logoText}>QTips</Text>
      </View>

      <View style={sb.divider} />

      {/* Nav items */}
      <View style={sb.nav}>
        {SIDE_ITEMS.map((item) => {
          const active = isActive(item);
          const isQR = item.tabName === "qr";

          return (
            <Pressable
              key={item.route}
              style={({ pressed }) => [
                sb.navItem,
                active && sb.navItemActive,
                isQR && sb.navItemQR,
                isQR && active && sb.navItemQRActive,
                pressed && { opacity: 0.75 },
              ]}
              onPress={() => router.push(item.route as never)}
            >
              <Ionicons
                name={active ? item.iconFocused : item.icon}
                size={20}
                color={isQR ? "#FFFFFF" : active ? C.VIOLET_PRIMARY : C.TEXT_SECONDARY}
              />
              <Text
                style={[
                  sb.navLabel,
                  active && sb.navLabelActive,
                  isQR && sb.navLabelQR,
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={{ flex: 1 }} />

      <Text style={sb.footer}>QTips · Propinas digitales</Text>
    </View>
  );
}

const sb = StyleSheet.create({
  sidebar: {
    width: 220,
    backgroundColor: C.BG_CARD,
    borderRightWidth: 1,
    borderRightColor: C.BORDER,
    paddingTop: 28,
    paddingBottom: 20,
    paddingHorizontal: 12,
  },
  logoArea: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 4,
    paddingBottom: 16,
  },
  logoMark: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: C.VIOLET_PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    ...SHADOW.violetSm,
  },
  logoText: { color: C.TEXT_PRIMARY, fontSize: 18, fontWeight: "800" },
  divider: { height: 1, backgroundColor: C.BORDER, marginBottom: 12 },
  nav: { gap: 4 },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: RADIUS.sm,
  },
  navItemActive: { backgroundColor: C.VIOLET_SUBTLE },
  navItemQR: {
    backgroundColor: C.VIOLET_PRIMARY,
    marginVertical: 2,
    ...SHADOW.violetSm,
  },
  navItemQRActive: { backgroundColor: C.VIOLET_DARK },
  navLabel: { color: C.TEXT_SECONDARY, fontSize: 14, fontWeight: "600" },
  navLabelActive: { color: C.VIOLET_PRIMARY, fontWeight: "700" },
  navLabelQR: { color: "#FFFFFF", fontWeight: "700" },
  footer: { color: C.TEXT_TERTIARY, fontSize: 11, textAlign: "center", paddingHorizontal: 4 },
});

// ─── Layout ───────────────────────────────────────────────────────────────────

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const pathname = usePathname();
  const isDesktop = width >= DESKTOP_BREAKPOINT;

  const mobileTabBarStyle = {
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
  };

  const tabs = (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: isDesktop ? ({ display: "none" } as const) : mobileTabBarStyle,
        tabBarActiveTintColor: C.VIOLET_PRIMARY,
        tabBarInactiveTintColor: C.TEXT_TERTIARY,
        tabBarLabelStyle: isDesktop ? undefined : {
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
      {/* Hidden — not in nav bar */}
      <Tabs.Screen name="index"               options={{ href: null }} />
      <Tabs.Screen name="login"               options={{ href: null }} />
      <Tabs.Screen name="explore"             options={{ href: null }} />
      <Tabs.Screen name="settings/bank"       options={{ href: null }} />
      <Tabs.Screen name="settings/employees"  options={{ href: null }} />
      <Tabs.Screen name="settings/tip-config" options={{ href: null }} />
    </Tabs>
  );

  if (isDesktop) {
    return (
      <View style={layout.container}>
        <DesktopSidebar pathname={pathname} />
        <View style={layout.content}>{tabs}</View>
      </View>
    );
  }

  return tabs;
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
    marginTop: -8,
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

const layout = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: C.BG_SCREEN,
  },
  content: {
    flex: 1,
  },
});
