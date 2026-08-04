import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C, RADIUS, SHADOW } from "../../constants/theme";
import type { ToastMessage } from "../../hooks/use-toast";

type IconName = keyof typeof Ionicons.glyphMap;

const ICON_MAP: Record<string, IconName> = {
  success: "checkmark-circle",
  error: "alert-circle",
  info: "information-circle",
};

const COLOR_MAP: Record<string, string> = {
  success: "#059669",
  error: C.ERROR,
  info: C.VIOLET_PRIMARY,
};

const BG_MAP: Record<string, string> = {
  success: "#ECFDF5",
  error: C.ERROR_SUBTLE,
  info: C.VIOLET_SUBTLE,
};

const BORDER_MAP: Record<string, string> = {
  success: "#6EE7B7",
  error: "#FECDD3",
  info: C.VIOLET_BORDER,
};

type Props = {
  message: ToastMessage | null;
};

export function Toast({ message }: Props) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-80)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (message) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 80,
          friction: 10,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -80,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [message, translateY, opacity]);

  const type = message?.type ?? "info";
  const color = COLOR_MAP[type] ?? C.VIOLET_PRIMARY;
  const bg = BG_MAP[type] ?? C.VIOLET_SUBTLE;
  const border = BORDER_MAP[type] ?? C.VIOLET_BORDER;
  const icon = ICON_MAP[type] ?? "information-circle";

  return (
    <Animated.View
      style={[
        styles.container,
        { top: insets.top + 12, opacity, transform: [{ translateY }] },
      ]}
      pointerEvents="none"
    >
      <Animated.View
        style={[styles.toast, { backgroundColor: bg, borderColor: border }]}
      >
        <Ionicons name={icon} size={18} color={color} />
        <Text style={[styles.text, { color }]} numberOfLines={2}>
          {message?.text ?? ""}
        </Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 9999,
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    ...SHADOW.md,
  },
  text: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 19,
  },
});
