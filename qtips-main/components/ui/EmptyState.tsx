import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { C, RADIUS, SHADOW } from "../../constants/theme";

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({ icon, title, description, actionLabel, onAction }: Props) {
  return (
    <View style={styles.box}>
      <View style={styles.iconCircle}>
        <Ionicons name={icon} size={32} color={C.TEXT_TERTIARY} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      {actionLabel && onAction && (
        <Pressable
          style={({ pressed }) => [styles.action, pressed && { opacity: 0.75, transform: [{ scale: 0.97 }] }]}
          onPress={onAction}
        >
          <Text style={styles.actionText}>{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: C.BG_CARD,
    borderRadius: RADIUS.lg,
    padding: 32,
    alignItems: "center",
    gap: 8,
    ...SHADOW.sm,
    borderWidth: 1,
    borderColor: C.BORDER,
    marginTop: 8,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: C.BG_INPUT,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  title: {
    color: C.TEXT_PRIMARY,
    fontSize: 17,
    fontWeight: "800",
    textAlign: "center",
  },
  description: {
    color: C.TEXT_SECONDARY,
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 260,
  },
  action: {
    marginTop: 8,
    backgroundColor: C.VIOLET_PRIMARY,
    borderRadius: RADIUS.sm,
    paddingVertical: 11,
    paddingHorizontal: 24,
  },
  actionText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});
