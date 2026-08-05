import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C, RADIUS } from "../../constants/theme";
import { IS_DEMO } from "../../lib/demo-data";

/**
 * Shows a visible but non-intrusive banner when EXPO_PUBLIC_DEMO_MODE=true.
 * Place it as first child inside the screen's outer View (outside ScrollView).
 */
export function DemoModeBadge() {
  const insets = useSafeAreaInsets();

  if (!IS_DEMO) return null;

  return (
    <View style={[styles.bar, { top: insets.top + 4 }]}>
      <Ionicons name="flask-outline" size={12} color="#92400E" />
      <Text style={styles.text}>Modo demostración — datos de ejemplo</Text>
    </View>
  );
}

/** Inline chip version for use inside screen content */
export function DemoChip() {
  if (!IS_DEMO) return null;
  return (
    <View style={styles.chip}>
      <Ionicons name="flask-outline" size={11} color="#92400E" />
      <Text style={styles.chipText}>Demo</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    left: 12,
    right: 12,
    zIndex: 999,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#FEF9C3",
    borderRadius: RADIUS.xs,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  text: {
    color: "#92400E",
    fontSize: 11,
    fontWeight: "700",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FEF9C3",
    borderRadius: RADIUS.full,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: "#FDE68A",
    alignSelf: "flex-start",
  },
  chipText: {
    color: "#92400E",
    fontSize: 10,
    fontWeight: "700",
  },
});
