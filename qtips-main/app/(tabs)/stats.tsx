import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { onAuthStateChanged, type User } from "firebase/auth";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { auth, db } from "../../lib/firebase";
import { C, SHADOW, RADIUS } from "../../constants/theme";

type TipDoc = {
  amount: number;
  createdAt: any;
};

type ChartItem = {
  label: string;
  value: number;
};

const DAY_LABELS = ["D", "L", "M", "X", "J", "V", "S"];

function getWeeklyData(tips: TipDoc[]): ChartItem[] {
  const now = new Date();
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(now);
    day.setDate(now.getDate() - (6 - i));
    day.setHours(0, 0, 0, 0);
    const dayEnd = new Date(day);
    dayEnd.setHours(23, 59, 59, 999);

    const value = tips
      .filter((t) => {
        if (!t.createdAt?.toDate) return false;
        const d = t.createdAt.toDate();
        return d >= day && d <= dayEnd;
      })
      .reduce((sum, t) => sum + (t.amount ?? 0), 0);

    return { label: DAY_LABELS[day.getDay()], value };
  });
}

function getMonthlyData(tips: TipDoc[]): ChartItem[] {
  const now = new Date();
  return Array.from({ length: 4 }, (_, i) => {
    const weekEnd = new Date(now);
    weekEnd.setDate(now.getDate() - (3 - i) * 7);
    weekEnd.setHours(23, 59, 59, 999);
    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekEnd.getDate() - 6);
    weekStart.setHours(0, 0, 0, 0);

    const value = tips
      .filter((t) => {
        if (!t.createdAt?.toDate) return false;
        const d = t.createdAt.toDate();
        return d >= weekStart && d <= weekEnd;
      })
      .reduce((sum, t) => sum + (t.amount ?? 0), 0);

    return { label: `S${i + 1}`, value };
  });
}

export default function StatsScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<"weekly" | "monthly">("weekly");
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);
  const [tips, setTips] = useState<TipDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (!firebaseUser) {
        setLoading(false);
        return;
      }

      const q = query(
        collection(db, "tips"),
        where("restaurantId", "==", firebaseUser.uid)
      );

      const unsubscribeTips = onSnapshot(q, (snapshot) => {
        setTips(
          snapshot.docs.map((d) => ({
            amount: d.data().amount ?? 0,
            createdAt: d.data().createdAt,
          }))
        );
        setLoading(false);
      });

      return unsubscribeTips;
    });

    return unsubscribeAuth;
  }, []);

  const data = mode === "weekly" ? getWeeklyData(tips) : getMonthlyData(tips);
  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const total = tips.reduce((sum, t) => sum + (t.amount ?? 0), 0);
  const MAX_BAR_HEIGHT = 160;

  if (loading) {
    return (
      <View style={[styles.screen, { justifyContent: "center" }]}>
        <ActivityIndicator size="large" color={C.VIOLET_PRIMARY} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Pressable onPress={() => router.back()} style={styles.backBtn}>
        <Ionicons name="chevron-back" size={18} color={C.VIOLET_PRIMARY} />
        <Text style={styles.back}>Volver</Text>
      </Pressable>

      <Text style={styles.title}>Estadísticas</Text>
      <Text style={styles.subtitle}>
        {mode === "weekly"
          ? "Propinas por día — últimos 7 días"
          : "Propinas por semana — último mes"}
      </Text>

      {/* Mode switch */}
      <View style={styles.switch}>
        <Pressable
          style={[styles.switchButton, mode === "weekly" && styles.activeSwitch]}
          onPress={() => setMode("weekly")}
        >
          <Text style={mode === "weekly" ? styles.activeText : styles.switchText}>
            Semanal
          </Text>
        </Pressable>

        <Pressable
          style={[styles.switchButton, mode === "monthly" && styles.activeSwitch]}
          onPress={() => setMode("monthly")}
        >
          <Text style={mode === "monthly" ? styles.activeText : styles.switchText}>
            Mensual
          </Text>
        </Pressable>
      </View>

      {/* Chart card */}
      <View style={styles.chartCard}>
        <View style={styles.chart}>
          {data.map((item, index) => {
            const barHeight = (item.value / maxValue) * MAX_BAR_HEIGHT;
            const isActive = hoveredBar === index;

            return (
              <View key={index} style={styles.barWrapper}>
                <Pressable
                  onHoverIn={() => setHoveredBar(index)}
                  onHoverOut={() => setHoveredBar(null)}
                >
                  {isActive && item.value > 0 && (
                    <View style={styles.tooltip}>
                      <Text style={styles.tooltipText}>{item.value} €</Text>
                    </View>
                  )}
                  <View
                    style={[
                      styles.bar,
                      { height: Math.max(barHeight, item.value > 0 ? 4 : 0) },
                      isActive && styles.barActive,
                    ]}
                  />
                </Pressable>
                <Text style={styles.barLabel}>{item.label}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Total card */}
      <View style={styles.totalCard}>
        <View style={styles.totalRow}>
          <View>
            <Text style={styles.totalLabel}>TOTAL ACUMULADO</Text>
            <Text style={styles.totalValue}>{total.toFixed(2)} €</Text>
          </View>
          <View style={styles.tipsCountBadge}>
            <Ionicons name="receipt-outline" size={14} color={C.GREEN_POSITIVE} />
            <Text style={styles.tipsCount}>
              {tips.length} propina{tips.length !== 1 ? "s" : ""}
            </Text>
          </View>
        </View>
      </View>

      {tips.length === 0 && (
        <Text style={styles.note}>Aún no hay propinas registradas.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.BG_SCREEN,
    padding: 24,
    alignItems: "center",
  },
  backBtn: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginBottom: 12,
  },
  back: {
    color: C.VIOLET_PRIMARY,
    fontWeight: "600",
    fontSize: 15,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: C.TEXT_PRIMARY,
  },
  subtitle: {
    color: C.TEXT_SECONDARY,
    marginBottom: 20,
    textAlign: "center",
    fontSize: 13,
    marginTop: 4,
  },

  // Switch
  switch: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 24,
    backgroundColor: C.BG_CARD,
    borderRadius: RADIUS.full,
    padding: 4,
    ...SHADOW.sm,
    borderWidth: 1,
    borderColor: C.BORDER,
  },
  switchButton: {
    paddingVertical: 10,
    paddingHorizontal: 28,
    borderRadius: RADIUS.full,
  },
  activeSwitch: {
    backgroundColor: C.VIOLET_PRIMARY,
  },
  switchText: {
    color: C.TEXT_TERTIARY,
    fontWeight: "600",
    fontSize: 14,
  },
  activeText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },

  // Chart
  chartCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: C.BG_CARD,
    borderRadius: RADIUS.lg,
    paddingVertical: 28,
    paddingHorizontal: 16,
    marginBottom: 16,
    ...SHADOW.md,
    borderWidth: 1,
    borderColor: C.BORDER,
  },
  chart: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    height: 200,
  },
  barWrapper: {
    alignItems: "center",
    width: 44,
  },
  bar: {
    width: 28,
    backgroundColor: C.VIOLET_PRIMARY,
    borderRadius: 8,
    opacity: 0.85,
  },
  barActive: {
    backgroundColor: C.VIOLET_DARK,
    opacity: 1,
  },
  barLabel: {
    color: C.TEXT_TERTIARY,
    marginTop: 8,
    fontSize: 12,
    fontWeight: "500",
  },
  tooltip: {
    position: "absolute",
    top: -36,
    backgroundColor: C.TEXT_PRIMARY,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.xs,
    zIndex: 10,
    alignSelf: "center",
  },
  tooltipText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },

  // Total
  totalCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: C.BG_CARD,
    borderRadius: RADIUS.lg,
    padding: 20,
    marginBottom: 12,
    ...SHADOW.md,
    borderWidth: 1,
    borderColor: C.BORDER,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: {
    color: C.TEXT_TERTIARY,
    marginBottom: 4,
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  totalValue: {
    fontSize: 32,
    fontWeight: "800",
    color: C.TEXT_PRIMARY,
  },
  tipsCountBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(32,214,155,0.1)",
    borderRadius: RADIUS.sm,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  tipsCount: {
    color: C.GREEN_POSITIVE,
    fontSize: 14,
    fontWeight: "700",
  },
  note: {
    color: C.TEXT_TERTIARY,
    fontSize: 13,
    textAlign: "center",
    marginTop: 8,
  },
});
