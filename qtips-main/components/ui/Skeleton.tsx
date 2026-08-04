import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View, ViewStyle } from "react-native";
import { C, RADIUS } from "../../constants/theme";

// ─── Base skeleton ────────────────────────────────────────────────────────────

type SkeletonProps = {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
  style?: ViewStyle;
};

export function Skeleton({ width = "100%", height = 16, radius = RADIUS.xs, style }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.9, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.35, duration: 700, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        { width: width as ViewStyle["width"], height, borderRadius: radius, backgroundColor: "#E2E8F0" },
        { opacity },
        style,
      ]}
    />
  );
}

// ─── Tip / movement card skeleton ────────────────────────────────────────────

export function TipCardSkeleton() {
  return (
    <View style={styles.card}>
      <Skeleton width={36} height={36} radius={10} />
      <View style={styles.cardBody}>
        <View style={styles.cardRow}>
          <Skeleton width="55%" height={14} />
          <Skeleton width={50} height={14} />
        </View>
        <View style={[styles.cardRow, { marginTop: 6 }]}>
          <Skeleton width="35%" height={11} />
          <Skeleton width={60} height={18} radius={RADIUS.xs} />
        </View>
      </View>
    </View>
  );
}

// ─── Stat card skeleton ───────────────────────────────────────────────────────

export function StatCardSkeleton({ flex = 1 }: { flex?: number }) {
  return (
    <View style={[styles.statCard, { flex }]}>
      <Skeleton width="70%" height={11} />
      <Skeleton width="80%" height={28} style={{ marginTop: 8 }} radius={RADIUS.xs} />
    </View>
  );
}

// ─── Employee row skeleton ────────────────────────────────────────────────────

export function EmployeeRowSkeleton() {
  return (
    <View style={styles.empCard}>
      <Skeleton width={40} height={40} radius={20} />
      <View style={styles.empBody}>
        <Skeleton width="60%" height={14} />
        <Skeleton width="40%" height={11} style={{ marginTop: 5 }} />
      </View>
      <Skeleton width={32} height={32} radius={RADIUS.xs} />
    </View>
  );
}

// ─── Home header skeleton ─────────────────────────────────────────────────────

export function HomeHeaderSkeleton() {
  return (
    <View style={styles.homeHeader}>
      <View style={styles.homeHeaderText}>
        <Skeleton width={80} height={12} style={{ marginBottom: 6 }} />
        <Skeleton width="65%" height={22} />
        <Skeleton width="45%" height={12} style={{ marginTop: 5 }} />
      </View>
      <Skeleton width={48} height={48} radius={24} />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    backgroundColor: C.BG_CARD,
    borderRadius: RADIUS.md,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: C.BORDER,
  },
  cardBody: { flex: 1, gap: 0 },
  cardRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },

  statCard: {
    backgroundColor: C.BG_CARD,
    borderRadius: RADIUS.md,
    padding: 16,
    borderWidth: 1,
    borderColor: C.BORDER,
  },

  empCard: {
    backgroundColor: C.BG_CARD,
    borderRadius: RADIUS.md,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: C.BORDER,
  },
  empBody: { flex: 1 },

  homeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  homeHeaderText: { flex: 1, marginRight: 12 },
});
