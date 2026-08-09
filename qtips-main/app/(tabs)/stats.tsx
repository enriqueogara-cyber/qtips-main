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
import { useRouter } from "expo-router";
import { EmptyState } from "../../components/ui/EmptyState";
import { C, RADIUS, SHADOW } from "../../constants/theme";
import { DEMO_TIPS, IS_DEMO } from "../../lib/demo-data";
import { auth, db } from "../../lib/firebase";

// ─── Types ────────────────────────────────────────────────────────────────────

type TipDoc = {
  amount: number;
  status: string;
  isTest: boolean;
  employeeName: string;
  createdAt: { toDate?: () => Date } | null;
};

type ChartItem = { label: string; value: number };
type StatPeriod = "7d" | "30d" | "month";

const DAY_NAMES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const DAY_LABELS = ["D", "L", "M", "X", "J", "V", "S"];

// ─── Period helpers ───────────────────────────────────────────────────────────

function getPeriodBounds(period: StatPeriod): { start: Date; label: string } {
  const now = new Date();
  switch (period) {
    case "7d": {
      const start = new Date(now);
      start.setDate(now.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      return { start, label: "últimos 7 días" };
    }
    case "30d": {
      const start = new Date(now);
      start.setDate(now.getDate() - 30);
      start.setHours(0, 0, 0, 0);
      return { start, label: "últimos 30 días" };
    }
    case "month": {
      const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      return {
        start,
        label: now.toLocaleDateString("es-ES", { month: "long" }),
      };
    }
  }
}

function getChartData(tips: TipDoc[], period: StatPeriod): ChartItem[] {
  const now = new Date();
  if (period === "7d") {
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(now);
      day.setDate(now.getDate() - (6 - i));
      day.setHours(0, 0, 0, 0);
      const dayEnd = new Date(day);
      dayEnd.setHours(23, 59, 59, 999);
      const value = tips
        .filter((t) => {
          if (!t.createdAt?.toDate || t.status !== "paid" || t.isTest) return false;
          const d = t.createdAt.toDate();
          return d >= day && d <= dayEnd;
        })
        .reduce((s, t) => s + t.amount, 0);
      return { label: DAY_LABELS[day.getDay()], value };
    });
  }
  if (period === "30d") {
    return Array.from({ length: 6 }, (_, i) => {
      const weekEnd = new Date(now);
      weekEnd.setDate(now.getDate() - (5 - i) * 5);
      weekEnd.setHours(23, 59, 59, 999);
      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekEnd.getDate() - 4);
      weekStart.setHours(0, 0, 0, 0);
      const value = tips
        .filter((t) => {
          if (!t.createdAt?.toDate || t.status !== "paid" || t.isTest) return false;
          const d = t.createdAt.toDate();
          return d >= weekStart && d <= weekEnd;
        })
        .reduce((s, t) => s + t.amount, 0);
      const labelDate = new Date(weekStart);
      return { label: `${labelDate.getDate()}/${labelDate.getMonth() + 1}`, value };
    });
  }
  // month — by week of this month
  return Array.from({ length: 5 }, (_, i) => {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const weekStart = new Date(monthStart);
    weekStart.setDate(monthStart.getDate() + i * 7);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    if (weekStart.getMonth() !== now.getMonth()) return null;
    const value = tips
      .filter((t) => {
        if (!t.createdAt?.toDate || t.status !== "paid" || t.isTest) return false;
        const d = t.createdAt.toDate();
        return d >= weekStart && d <= weekEnd;
      })
      .reduce((s, t) => s + t.amount, 0);
    return { label: `S${i + 1}`, value };
  }).filter(Boolean) as ChartItem[];
}

// ─── Metric card ─────────────────────────────────────────────────────────────

function MetricCard({
  label, value, icon, sub, accent = false,
}: {
  label: string; value: string; icon: keyof typeof Ionicons.glyphMap; sub?: string; accent?: boolean;
}) {
  return (
    <View style={[mCard.card, accent && mCard.cardAccent]}>
      <View style={[mCard.icon, accent && mCard.iconAccent]}>
        <Ionicons name={icon} size={16} color={accent ? "#FFFFFF" : C.VIOLET_PRIMARY} />
      </View>
      <Text style={mCard.label}>{label}</Text>
      <Text style={[mCard.value, accent && mCard.valueAccent]}>{value}</Text>
      {sub && <Text style={mCard.sub}>{sub}</Text>}
    </View>
  );
}

const mCard = StyleSheet.create({
  card: {
    flex: 1, minWidth: 130,
    backgroundColor: C.BG_CARD,
    borderRadius: RADIUS.md,
    padding: 14,
    ...SHADOW.sm,
    borderWidth: 1,
    borderColor: C.BORDER,
  },
  cardAccent: {
    backgroundColor: C.VIOLET_EXTRA_LIGHT,
    borderColor: C.VIOLET_BORDER,
  },
  icon: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: C.VIOLET_SUBTLE,
    alignItems: "center", justifyContent: "center",
    marginBottom: 10,
  },
  iconAccent: { backgroundColor: C.VIOLET_PRIMARY },
  label: { color: C.TEXT_TERTIARY, fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
  value: { color: C.TEXT_PRIMARY, fontSize: 20, fontWeight: "800" },
  valueAccent: { color: C.VIOLET_PRIMARY },
  sub: { color: C.TEXT_TERTIARY, fontSize: 11, marginTop: 2 },
});

// ─── Bar chart ────────────────────────────────────────────────────────────────

function BarChart({ data, period }: { data: ChartItem[]; period: StatPeriod }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const MAX_H = 130;

  return (
    <View style={chart.card}>
      <Text style={chart.title}>
        {period === "7d"
          ? "Propinas diarias — últimos 7 días"
          : period === "30d"
          ? "Propinas por tramo — últimos 30 días"
          : "Propinas por semana — este mes"}
      </Text>
      <View style={chart.bars}>
        {data.map((item, idx) => {
          const barH = (item.value / maxVal) * MAX_H;
          const active = hovered === idx;
          return (
            <View key={idx} style={chart.col}>
              <Pressable
                onHoverIn={() => setHovered(idx)}
                onHoverOut={() => setHovered(null)}
                onPress={() => setHovered(hovered === idx ? null : idx)}
                style={chart.barPressable}
              >
                {active && item.value > 0 && (
                  <View style={chart.tooltip}>
                    <Text style={chart.tooltipText}>{item.value.toFixed(2)} €</Text>
                  </View>
                )}
                <View
                  style={[
                    chart.bar,
                    { height: Math.max(barH, item.value > 0 ? 4 : 2) },
                    active && chart.barActive,
                    item.value === 0 && chart.barZero,
                  ]}
                />
              </Pressable>
              <Text style={chart.barLabel}>{item.label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const chart = StyleSheet.create({
  card: {
    backgroundColor: C.BG_CARD,
    borderRadius: RADIUS.lg,
    paddingVertical: 20,
    paddingHorizontal: 16,
    marginBottom: 16,
    ...SHADOW.md,
    borderWidth: 1,
    borderColor: C.BORDER,
  },
  title: { color: C.TEXT_SECONDARY, fontSize: 12, fontWeight: "600", marginBottom: 20 },
  bars: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", height: 160 },
  col: { flex: 1, alignItems: "center" },
  barPressable: { alignItems: "center", width: "100%", height: 140, justifyContent: "flex-end" },
  bar: { width: "60%", maxWidth: 28, backgroundColor: C.VIOLET_PRIMARY, borderRadius: 6, opacity: 0.85 },
  barActive: { backgroundColor: C.VIOLET_DARK, opacity: 1 },
  barZero: { backgroundColor: C.BORDER, opacity: 0.5 },
  barLabel: { color: C.TEXT_TERTIARY, marginTop: 8, fontSize: 10, fontWeight: "500" },
  tooltip: {
    position: "absolute",
    top: -34,
    backgroundColor: C.TEXT_PRIMARY,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.xs,
    zIndex: 10,
    minWidth: 54,
    alignItems: "center",
  },
  tooltipText: { color: "#FFFFFF", fontSize: 11, fontWeight: "700" },
});

// ─── Insights card ────────────────────────────────────────────────────────────

function InsightsCard({ tips, period }: { tips: TipDoc[]; period: StatPeriod }) {
  const { start } = getPeriodBounds(period);
  const real = tips.filter((t) => t.status === "paid" && !t.isTest && t.createdAt?.toDate?.() && (t.createdAt.toDate()!) >= start);

  const insights = useMemo(() => {
    const out: string[] = [];
    if (real.length === 0) return out;

    // Best day of week
    const byDow: Record<number, number> = {};
    real.forEach((t) => {
      if (!t.createdAt?.toDate) return;
      const dow = t.createdAt.toDate().getDay();
      byDow[dow] = (byDow[dow] ?? 0) + t.amount;
    });
    const bestDow = Object.entries(byDow).sort((a, b) => +b[1] - +a[1])[0];
    if (bestDow) {
      out.push(`${DAY_NAMES[+bestDow[0]]} es tu mejor día con ${(+bestDow[1]).toFixed(2)} € en propinas.`);
    }

    // Top employee
    const byEmp: Record<string, number> = {};
    real.forEach((t) => { byEmp[t.employeeName] = (byEmp[t.employeeName] ?? 0) + t.amount; });
    const topEmp = Object.entries(byEmp).sort((a, b) => b[1] - a[1])[0];
    if (topEmp) {
      out.push(`${topEmp[0]} lidera con ${topEmp[1].toFixed(2)} €.`);
    }

    // Avg tip
    const avg = real.reduce((s, t) => s + t.amount, 0) / real.length;
    if (avg > 0) {
      out.push(`La propina media es de ${avg.toFixed(2)} €.`);
    }

    return out;
  }, [real]);

  if (insights.length === 0) return null;

  return (
    <View style={ins.card}>
      <View style={ins.header}>
        <Ionicons name="sparkles" size={16} color={C.VIOLET_PRIMARY} />
        <Text style={ins.title}>Insights del periodo</Text>
      </View>
      {insights.map((text, i) => (
        <View key={i} style={ins.row}>
          <View style={ins.dot} />
          <Text style={ins.text}>{text}</Text>
        </View>
      ))}
    </View>
  );
}

const ins = StyleSheet.create({
  card: {
    backgroundColor: C.VIOLET_EXTRA_LIGHT,
    borderRadius: RADIUS.lg,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: C.VIOLET_BORDER,
  },
  header: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  title: { color: C.VIOLET_DARK, fontSize: 14, fontWeight: "800" },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 6 },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: C.VIOLET_PRIMARY, marginTop: 6, flexShrink: 0 },
  text: { color: C.VIOLET_DARK, fontSize: 13, lineHeight: 19, flex: 1 },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function StatsScreen() {
  const router = useRouter();
  const [period, setPeriod] = useState<StatPeriod>("7d");
  const [tips, setTips] = useState<TipDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (IS_DEMO) {
      setTips(DEMO_TIPS as unknown as TipDoc[]);
      setLoading(false);
      return;
    }
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

  const { start, label: periodLabel } = getPeriodBounds(period);

  const realAll = useMemo(() => tips.filter((t) => t.status === "paid" && !t.isTest), [tips]);
  const realPeriod = useMemo(
    () => realAll.filter((t) => t.createdAt?.toDate?.() && (t.createdAt.toDate()!) >= start),
    [realAll, start]
  );

  const total = useMemo(() => realPeriod.reduce((s, t) => s + t.amount, 0), [realPeriod]);
  const avg = realPeriod.length > 0 ? total / realPeriod.length : 0;
  const bestTip = useMemo(() => Math.max(...realPeriod.map((t) => t.amount), 0), [realPeriod]);

  const bestDay = useMemo(() => {
    if (realPeriod.length === 0) return null;
    const byDay: Record<string, number> = {};
    realPeriod.forEach((t) => {
      if (!t.createdAt?.toDate) return;
      const key = t.createdAt.toDate().toLocaleDateString("es-ES");
      byDay[key] = (byDay[key] ?? 0) + t.amount;
    });
    const best = Object.entries(byDay).sort((a, b) => b[1] - a[1])[0];
    return best ? { date: best[0], amount: best[1] } : null;
  }, [realPeriod]);

  const topEmployee = useMemo(() => {
    if (realPeriod.length === 0) return null;
    const map: Record<string, number> = {};
    realPeriod.forEach((t) => {
      map[t.employeeName] = (map[t.employeeName] ?? 0) + t.amount;
    });
    const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]);
    return sorted[0] ? { name: sorted[0][0], amount: sorted[0][1] } : null;
  }, [realPeriod]);

  const byEmployee = useMemo(() => {
    const map: Record<string, number> = {};
    realAll.forEach((t) => {
      map[t.employeeName] = (map[t.employeeName] ?? 0) + t.amount;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [realAll]);

  const chartData = useMemo(() => getChartData(tips, period), [tips, period]);

  const topPad = insets.top > 0 ? insets.top + 8 : 20;

  if (!IS_DEMO && !user && !loading) {
    return (
      <View style={[styles.screen, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={C.VIOLET_PRIMARY} />
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.screen, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={C.VIOLET_PRIMARY} />
      </View>
    );
  }

  const isEmpty = realAll.length === 0;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.scrollContent, { paddingTop: topPad }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.container}>
        {/* Header */}
        <Text style={styles.title}>Estadísticas</Text>
        <Text style={styles.subtitle}>Solo propinas reales completadas</Text>

        {isEmpty ? (
          <EmptyState
            icon="bar-chart-outline"
            title="Todavía no hay datos"
            description="Cuando recibas tus primeras propinas podrás ver la evolución de tu restaurante."
            actionLabel="Compartir mi QR"
            onAction={() => router.push("/qr")}
          />
        ) : (
          <>
            {/* Period selector */}
            <View style={styles.periodRow}>
              {(["7d", "30d", "month"] as const).map((p) => (
                <Pressable
                  key={p}
                  style={[styles.periodBtn, period === p && styles.periodBtnActive]}
                  onPress={() => setPeriod(p)}
                >
                  <Text style={[styles.periodText, period === p && styles.periodTextActive]}>
                    {p === "7d" ? "7 días" : p === "30d" ? "30 días" : "Este mes"}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Insights */}
            <InsightsCard tips={tips} period={period} />

            {/* KPI grid */}
            <View style={styles.metricsGrid}>
              <MetricCard
                label="Total"
                value={`${total.toFixed(2)} €`}
                icon="cash-outline"
                sub={periodLabel}
                accent
              />
              <MetricCard
                label="Propinas"
                value={String(realPeriod.length)}
                icon="receipt-outline"
              />
              <MetricCard
                label="Media"
                value={`${avg.toFixed(2)} €`}
                icon="analytics-outline"
              />
              {bestTip > 0 && (
                <MetricCard
                  label="Mejor propina"
                  value={`${bestTip.toFixed(2)} €`}
                  icon="star-outline"
                />
              )}
              {bestDay && (
                <MetricCard
                  label="Mejor día"
                  value={`${bestDay.amount.toFixed(2)} €`}
                  icon="trophy-outline"
                  sub={bestDay.date}
                />
              )}
              {topEmployee && (
                <MetricCard
                  label="Top empleado"
                  value={`${topEmployee.amount.toFixed(2)} €`}
                  icon="person-outline"
                  sub={topEmployee.name.split(" ")[0]}
                />
              )}
            </View>

            {/* Chart */}
            <BarChart data={chartData} period={period} />

            {/* By employee */}
            {byEmployee.length > 0 && (
              <View style={styles.employeeSection}>
                <Text style={styles.empSectionTitle}>Por persona · total histórico</Text>
                <View style={styles.empList}>
                  {byEmployee.slice(0, 6).map(([name, amount], i) => {
                    const topAmount = byEmployee[0][1];
                    const pct = topAmount > 0 ? (amount / topAmount) * 100 : 0;
                    return (
                      <View key={name} style={styles.empRow}>
                        <View style={styles.empRank}>
                          <Text style={styles.empRankText}>{i + 1}</Text>
                        </View>
                        <View style={styles.empAvatar}>
                          <Text style={styles.empAvatarText}>
                            {name.trim().split(" ").slice(0, 2).map((w: string) => w[0]?.toUpperCase() ?? "").join("")}
                          </Text>
                        </View>
                        <View style={styles.empBody}>
                          <View style={styles.empTop}>
                            <Text style={styles.empName} numberOfLines={1}>{name}</Text>
                            <Text style={styles.empAmount}>{amount.toFixed(2)} €</Text>
                          </View>
                          <View style={styles.empBarBg}>
                            <View style={[styles.empBarFill, { width: `${pct}%` as `${number}%` }]} />
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}
          </>
        )}

        <View style={{ height: 24 }} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.BG_SCREEN },
  scrollContent: { padding: 20, paddingBottom: 48 },
  container: { maxWidth: 560, width: "100%", alignSelf: "center" },

  title: { color: C.TEXT_PRIMARY, fontSize: 28, fontWeight: "800" },
  subtitle: { color: C.TEXT_SECONDARY, fontSize: 13, marginTop: 4, marginBottom: 20 },

  periodRow: {
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
  periodBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: RADIUS.full },
  periodBtnActive: { backgroundColor: C.VIOLET_PRIMARY },
  periodText: { color: C.TEXT_TERTIARY, fontWeight: "600", fontSize: 13 },
  periodTextActive: { color: "#FFFFFF", fontWeight: "700" },

  metricsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 },

  employeeSection: { marginTop: 4 },
  empSectionTitle: { color: C.TEXT_PRIMARY, fontSize: 17, fontWeight: "800", marginBottom: 14 },
  empList: { gap: 10 },
  empRow: {
    backgroundColor: C.BG_CARD,
    borderRadius: RADIUS.md,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    ...SHADOW.sm,
    borderWidth: 1,
    borderColor: C.BORDER,
  },
  empRank: {
    width: 20,
    alignItems: "center",
    flexShrink: 0,
  },
  empRankText: { color: C.TEXT_TERTIARY, fontSize: 13, fontWeight: "700" },
  empAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.VIOLET_SUBTLE,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: C.VIOLET_BORDER,
    flexShrink: 0,
  },
  empAvatarText: { color: C.VIOLET_PRIMARY, fontSize: 12, fontWeight: "800" },
  empBody: { flex: 1 },
  empTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 5 },
  empName: { flex: 1, color: C.TEXT_PRIMARY, fontSize: 14, fontWeight: "700", marginRight: 8 },
  empAmount: { color: C.GREEN_POSITIVE, fontSize: 14, fontWeight: "800" },
  empBarBg: { height: 4, backgroundColor: C.BORDER, borderRadius: 2 },
  empBarFill: { height: 4, backgroundColor: C.VIOLET_PRIMARY, borderRadius: 2, opacity: 0.7 },
});
