import { Ionicons } from "@expo/vector-icons";
import { onAuthStateChanged, type User } from "firebase/auth";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { EmptyState } from "../../components/ui/EmptyState";
import { C, RADIUS, SHADOW } from "../../constants/theme";
import { auth, db } from "../../lib/firebase";

type TipDoc = {
  amount: number;
  status: string;
  isTest: boolean;
  employeeName: string;
  createdAt: { toDate?: () => Date } | null;
};

type ChartItem = { label: string; value: number };

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
        return d >= day && d <= dayEnd && t.status === "paid" && !t.isTest;
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
        return d >= weekStart && d <= weekEnd && t.status === "paid" && !t.isTest;
      })
      .reduce((sum, t) => sum + (t.amount ?? 0), 0);
    return { label: `S${i + 1}`, value };
  });
}

export default function StatsScreen() {
  const [mode, setMode] = useState<"weekly" | "monthly">("weekly");
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);
  const [tips, setTips] = useState<TipDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (!firebaseUser) { setLoading(false); return; }

      const q = query(collection(db, "tips"), where("restaurantId", "==", firebaseUser.uid));
      const unsubSnap = onSnapshot(q, (snap) => {
        setTips(
          snap.docs.map((d) => ({
            amount: d.data().amount ?? 0,
            status: d.data().status ?? "paid",
            isTest: d.data().isTest ?? false,
            employeeName: d.data().employeeName ?? "Propina general",
            createdAt: d.data().createdAt ?? null,
          }))
        );
        setLoading(false);
      });
      return unsubSnap;
    });
    return unsubAuth;
  }, []);

  const realTips = useMemo(() => tips.filter((t) => t.status === "paid" && !t.isTest), [tips]);

  const data = mode === "weekly" ? getWeeklyData(tips) : getMonthlyData(tips);
  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const MAX_BAR_HEIGHT = 140;

  const total = useMemo(() => realTips.reduce((s, t) => s + (t.amount ?? 0), 0), [realTips]);
  const avg = realTips.length > 0 ? total / realTips.length : 0;
  const bestDay = useMemo(() => {
    if (realTips.length === 0) return null;
    const byDay: Record<string, number> = {};
    realTips.forEach((t) => {
      if (!t.createdAt?.toDate) return;
      const key = t.createdAt.toDate().toLocaleDateString("es-ES");
      byDay[key] = (byDay[key] ?? 0) + (t.amount ?? 0);
    });
    const best = Object.entries(byDay).sort((a, b) => b[1] - a[1])[0];
    return best ? { date: best[0], amount: best[1] } : null;
  }, [realTips]);

  const byEmployee = useMemo(() => {
    const map: Record<string, number> = {};
    realTips.forEach((t) => {
      map[t.employeeName] = (map[t.employeeName] ?? 0) + (t.amount ?? 0);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [realTips]);

  if (!user || loading) {
    return (
      <View style={[styles.screen, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={C.VIOLET_PRIMARY} />
      </View>
    );
  }

  const isEmpty = realTips.length === 0;
  const topPad = insets.top > 0 ? insets.top + 8 : 20;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.scrollContent, { paddingTop: topPad }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.container}>
        <Text style={styles.title}>Estadísticas</Text>
        <Text style={styles.subtitle}>Solo propinas reales completadas</Text>

        {isEmpty ? (
          <EmptyState
            icon="bar-chart-outline"
            title="Todavía no hay datos"
            description="Comparte tu QR o realiza un pago de prueba para empezar a ver estadísticas."
          />
        ) : (
          <>
            {/* Summary metrics */}
            <View style={styles.metricsGrid}>
              <MetricCard label="Total acumulado" value={`${total.toFixed(2)} €`} icon="cash-outline" />
              <MetricCard label="Propinas" value={String(realTips.length)} icon="receipt-outline" />
              <MetricCard label="Media" value={`${avg.toFixed(2)} €`} icon="analytics-outline" />
              {bestDay && (
                <MetricCard label="Mejor día" value={`${bestDay.amount.toFixed(2)} €`} icon="trophy-outline" sub={bestDay.date} />
              )}
            </View>

            {/* Mode switch */}
            <View style={styles.modeSwitch}>
              {(["weekly", "monthly"] as const).map((m) => (
                <Pressable
                  key={m}
                  style={[styles.modeBtn, mode === m && styles.modeBtnActive]}
                  onPress={() => setMode(m)}
                >
                  <Text style={[styles.modeBtnText, mode === m && styles.modeBtnTextActive]}>
                    {m === "weekly" ? "Semanal" : "Mensual"}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Chart */}
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>
                {mode === "weekly" ? "Propinas por día — últimos 7 días" : "Propinas por semana — último mes"}
              </Text>
              <View style={styles.chart}>
                {data.map((item, index) => {
                  const barH = (item.value / maxValue) * MAX_BAR_HEIGHT;
                  const isActive = hoveredBar === index;
                  return (
                    <View key={index} style={styles.barWrapper}>
                      <Pressable
                        onHoverIn={() => setHoveredBar(index)}
                        onHoverOut={() => setHoveredBar(null)}
                        onPress={() => setHoveredBar(hoveredBar === index ? null : index)}
                      >
                        {isActive && item.value > 0 && (
                          <View style={styles.tooltip}>
                            <Text style={styles.tooltipText}>{item.value.toFixed(2)} €</Text>
                          </View>
                        )}
                        <View
                          style={[
                            styles.bar,
                            { height: Math.max(barH, item.value > 0 ? 4 : 2) },
                            isActive && styles.barActive,
                            item.value === 0 && styles.barZero,
                          ]}
                        />
                      </Pressable>
                      <Text style={styles.barLabel}>{item.label}</Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* By employee */}
            {byEmployee.length > 0 && (
              <View style={styles.employeeSection}>
                <Text style={styles.empSectionTitle}>Por persona</Text>
                <View style={styles.empList}>
                  {byEmployee.slice(0, 6).map(([name, amount]) => (
                    <View key={name} style={styles.empRow}>
                      <View style={styles.empAvatar}>
                        <Text style={styles.empAvatarText}>
                          {name.trim().split(" ").slice(0, 2).map((w: string) => w[0]?.toUpperCase() ?? "").join("")}
                        </Text>
                      </View>
                      <Text style={styles.empName} numberOfLines={1}>{name}</Text>
                      <Text style={styles.empAmount}>{amount.toFixed(2)} €</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </>
        )}
      </View>
    </ScrollView>
  );
}

function MetricCard({ label, value, icon, sub }: { label: string; value: string; icon: keyof typeof Ionicons.glyphMap; sub?: string }) {
  return (
    <View style={styles.metricCard}>
      <View style={styles.metricIcon}>
        <Ionicons name={icon} size={16} color={C.VIOLET_PRIMARY} />
      </View>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
      {sub && <Text style={styles.metricSub}>{sub}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.BG_SCREEN },
  scrollContent: { padding: 20, paddingBottom: 48 },
  container: { maxWidth: 560, width: "100%", alignSelf: "center" },

  title: { color: C.TEXT_PRIMARY, fontSize: 28, fontWeight: "800" },
  subtitle: { color: C.TEXT_SECONDARY, fontSize: 13, marginTop: 4, marginBottom: 20 },

  emptyBox: {
    backgroundColor: C.BG_CARD,
    borderRadius: RADIUS.lg,
    padding: 40,
    alignItems: "center",
    gap: 10,
    ...SHADOW.sm,
    borderWidth: 1,
    borderColor: C.BORDER,
    marginTop: 8,
  },
  emptyTitle: { color: C.TEXT_PRIMARY, fontSize: 17, fontWeight: "800", marginTop: 8 },
  emptyText: { color: C.TEXT_SECONDARY, fontSize: 13, textAlign: "center", lineHeight: 20, maxWidth: 260 },

  metricsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 20 },
  metricCard: {
    flex: 1,
    minWidth: 140,
    backgroundColor: C.BG_CARD,
    borderRadius: RADIUS.md,
    padding: 14,
    ...SHADOW.sm,
    borderWidth: 1,
    borderColor: C.BORDER,
  },
  metricIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: C.VIOLET_SUBTLE,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  metricLabel: { color: C.TEXT_TERTIARY, fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
  metricValue: { color: C.TEXT_PRIMARY, fontSize: 22, fontWeight: "800" },
  metricSub: { color: C.TEXT_TERTIARY, fontSize: 11, marginTop: 2 },

  modeSwitch: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 16,
    backgroundColor: C.BG_CARD,
    borderRadius: RADIUS.full,
    padding: 4,
    ...SHADOW.sm,
    borderWidth: 1,
    borderColor: C.BORDER,
    alignSelf: "flex-start",
  },
  modeBtn: { paddingVertical: 8, paddingHorizontal: 20, borderRadius: RADIUS.full },
  modeBtnActive: { backgroundColor: C.VIOLET_PRIMARY },
  modeBtnText: { color: C.TEXT_TERTIARY, fontWeight: "600", fontSize: 13 },
  modeBtnTextActive: { color: "#FFFFFF", fontWeight: "700" },

  chartCard: {
    backgroundColor: C.BG_CARD,
    borderRadius: RADIUS.lg,
    paddingVertical: 20,
    paddingHorizontal: 14,
    marginBottom: 16,
    ...SHADOW.md,
    borderWidth: 1,
    borderColor: C.BORDER,
  },
  chartTitle: { color: C.TEXT_SECONDARY, fontSize: 12, fontWeight: "600", marginBottom: 16 },
  chart: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    height: 160,
  },
  barWrapper: { alignItems: "center", flex: 1 },
  bar: { width: "60%", maxWidth: 28, backgroundColor: C.VIOLET_PRIMARY, borderRadius: 6, opacity: 0.85 },
  barActive: { backgroundColor: C.VIOLET_DARK, opacity: 1 },
  barZero: { backgroundColor: C.BORDER, opacity: 0.5 },
  barLabel: { color: C.TEXT_TERTIARY, marginTop: 8, fontSize: 11, fontWeight: "500" },
  tooltip: {
    position: "absolute",
    top: -34,
    backgroundColor: C.TEXT_PRIMARY,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.xs,
    zIndex: 10,
    alignSelf: "center",
    minWidth: 50,
    alignItems: "center",
  },
  tooltipText: { color: "#FFFFFF", fontSize: 11, fontWeight: "700" },

  employeeSection: { marginTop: 4 },
  empSectionTitle: { color: C.TEXT_PRIMARY, fontSize: 17, fontWeight: "800", marginBottom: 12 },
  empList: { gap: 8 },
  empRow: {
    backgroundColor: C.BG_CARD,
    borderRadius: RADIUS.sm,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    ...SHADOW.sm,
    borderWidth: 1,
    borderColor: C.BORDER,
  },
  empAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: C.VIOLET_SUBTLE,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: C.VIOLET_BORDER,
  },
  empAvatarText: { color: C.VIOLET_PRIMARY, fontSize: 12, fontWeight: "800" },
  empName: { flex: 1, color: C.TEXT_PRIMARY, fontSize: 14, fontWeight: "600" },
  empAmount: { color: C.GREEN_POSITIVE, fontSize: 14, fontWeight: "800" },
});
