import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import React, { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DemoChip } from "../../components/ui/DemoModeBadge";
import { HomeHeaderSkeleton, Skeleton, StatCardSkeleton } from "../../components/ui/Skeleton";
import { C, RADIUS, SHADOW } from "../../constants/theme";
import { DEMO_EMPLOYEES, DEMO_RESTAURANT, DEMO_TIPS, IS_DEMO } from "../../lib/demo-data";
import { auth, db } from "../../lib/firebase";

// ─── Types ────────────────────────────────────────────────────────────────────

type TipItem = {
  id: string;
  amount: number;
  employeeName: string;
  status: string;
  isTest: boolean;
  createdAt?: { toDate?: () => Date } | null;
  restaurantId: string;
};

type RestaurantData = {
  name: string;
  address: string;
  stripe_onboarding_complete?: boolean;
  stripe_account_id?: string;
};

type StatPeriod = "week" | "month";

const DAY_LABELS = ["D", "L", "M", "X", "J", "V", "S"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 14) return "Buenos días";
  if (h < 21) return "Buenas tardes";
  return "Buenas noches";
}

function timeAgo(createdAt?: { toDate?: () => Date } | null): string {
  if (!createdAt?.toDate) return "hace un rato";
  const diff = Date.now() - createdAt.toDate().getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "hace unos segundos";
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.floor(h / 24)} d`;
}

function computePeriodStats(tips: TipItem[], period: StatPeriod) {
  const now = new Date();
  const days = period === "week" ? 7 : 30;

  const start = new Date(now);
  start.setDate(now.getDate() - days);
  start.setHours(0, 0, 0, 0);

  const prevStart = new Date(start);
  prevStart.setDate(start.getDate() - days);

  const real = tips.filter((t) => t.status !== "failed" && !t.isTest);

  const current = real.filter((t) => {
    const d = t.createdAt?.toDate?.();
    return d && d >= start;
  });

  const previous = real.filter((t) => {
    const d = t.createdAt?.toDate?.();
    return d && d >= prevStart && d < start;
  });

  const currentTotal = current.reduce((s, t) => s + t.amount, 0);
  const previousTotal = previous.reduce((s, t) => s + t.amount, 0);

  const change =
    previousTotal > 0
      ? ((currentTotal - previousTotal) / previousTotal) * 100
      : currentTotal > 0
      ? null
      : null;

  const avg = current.length > 0 ? currentTotal / current.length : 0;

  return { total: currentTotal, count: current.length, avg, change, previousTotal };
}

// ─── Mini sparkline ────────────────────────────────────────────────────────────

function MiniSparkline({ tips, period }: { tips: TipItem[]; period: StatPeriod }) {
  const data = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(now);
      day.setDate(now.getDate() - (6 - i));
      day.setHours(0, 0, 0, 0);
      const dayEnd = new Date(day);
      dayEnd.setHours(23, 59, 59, 999);
      const value = tips
        .filter((t) => {
          if (t.status !== "paid" || t.isTest) return false;
          const d = t.createdAt?.toDate?.();
          return d && d >= day && d <= dayEnd;
        })
        .reduce((s, t) => s + t.amount, 0);
      return { label: DAY_LABELS[day.getDay()], value };
    });
  }, [tips, period]);

  const maxVal = Math.max(...data.map((d) => d.value), 0.01);
  const MAX_H = 32;

  return (
    <View style={sparkStyles.wrap}>
      <Text style={sparkStyles.label}>
        {period === "week" ? "Últimos 7 días" : "Últimas 4 semanas"}
      </Text>
      <View style={sparkStyles.chart}>
        {data.map((item, i) => {
          const barH = Math.max((item.value / maxVal) * MAX_H, item.value > 0 ? 3 : 2);
          return (
            <View key={i} style={sparkStyles.col}>
              <View style={sparkStyles.barBg}>
                <View
                  style={[
                    sparkStyles.bar,
                    { height: barH, opacity: item.value > 0 ? 0.9 : 0.25 },
                  ]}
                />
              </View>
              <Text style={sparkStyles.barLabel}>{item.label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const sparkStyles = StyleSheet.create({
  wrap: { paddingTop: 16 },
  label: { color: "rgba(255,255,255,0.55)", fontSize: 10, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 8 },
  chart: { flexDirection: "row", alignItems: "flex-end", gap: 5 },
  col: { flex: 1, alignItems: "center", gap: 4 },
  barBg: { height: 36, justifyContent: "flex-end" },
  bar: { width: "100%", maxWidth: 22, borderRadius: 4, backgroundColor: "rgba(255,255,255,1)" },
  barLabel: { color: "rgba(255,255,255,0.5)", fontSize: 9, fontWeight: "600" },
});

// ─── Premium summary card ─────────────────────────────────────────────────────

function PremiumSummaryCard({
  tips,
  period,
  onPeriodChange,
  loading,
}: {
  tips: TipItem[];
  period: StatPeriod;
  onPeriodChange: (p: StatPeriod) => void;
  loading: boolean;
}) {
  const ps = useMemo(() => computePeriodStats(tips, period), [tips, period]);

  if (loading) {
    return (
      <View style={cardStyles.card}>
        <Skeleton width="45%" height={10} style={{ opacity: 0.35 }} />
        <Skeleton width="70%" height={40} radius={8} style={{ marginTop: 12, opacity: 0.35 }} />
        <Skeleton width="55%" height={11} style={{ marginTop: 10, opacity: 0.3 }} />
      </View>
    );
  }

  return (
    <View style={cardStyles.card}>
      {/* Period selector */}
      <View style={cardStyles.periodRow}>
        {(["week", "month"] as const).map((p) => (
          <Pressable
            key={p}
            style={[cardStyles.periodBtn, period === p && cardStyles.periodBtnActive]}
            onPress={() => onPeriodChange(p)}
          >
            <Text style={[cardStyles.periodText, period === p && cardStyles.periodTextActive]}>
              {p === "week" ? "Esta semana" : "Este mes"}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Label */}
      <Text style={cardStyles.subLabel}>Propinas recibidas</Text>

      {/* Main amount */}
      <Text style={cardStyles.amount}>
        {ps.total.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
      </Text>

      {/* Change badge */}
      {ps.change !== null ? (
        <View style={cardStyles.changeBadge}>
          <Ionicons
            name={ps.change >= 0 ? "trending-up" : "trending-down"}
            size={12}
            color={ps.change >= 0 ? "#6EE7B7" : "#FCA5A5"}
          />
          <Text style={[cardStyles.changeText, ps.change < 0 && { color: "#FCA5A5" }]}>
            {ps.change >= 0 ? "+" : ""}{ps.change.toFixed(1)}% respecto al periodo anterior
          </Text>
        </View>
      ) : ps.total === 0 ? (
        <Text style={cardStyles.noDataText}>Comparte tu QR para empezar a recibir propinas</Text>
      ) : null}

      {/* Count + avg */}
      <Text style={cardStyles.meta}>
        {ps.count} propina{ps.count !== 1 ? "s" : ""}
        {ps.count > 0 ? ` · Media ${ps.avg.toFixed(2)} €` : ""}
      </Text>

      {/* Sparkline */}
      <MiniSparkline tips={tips} period={period} />
    </View>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.xl,
    padding: 22,
    backgroundColor: C.VIOLET_PRIMARY,
    ...SHADOW.violet,
  },
  periodRow: { flexDirection: "row", gap: 4, marginBottom: 16 },
  periodBtn: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: RADIUS.full,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  periodBtnActive: { backgroundColor: "rgba(255,255,255,0.28)" },
  periodText: { color: "rgba(255,255,255,0.65)", fontSize: 12, fontWeight: "600" },
  periodTextActive: { color: "#FFFFFF", fontWeight: "700" },
  subLabel: { color: "rgba(255,255,255,0.65)", fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 },
  amount: { color: "#FFFFFF", fontSize: 38, fontWeight: "800", letterSpacing: -1 },
  changeBadge: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 6 },
  changeText: { color: "#6EE7B7", fontSize: 12, fontWeight: "600" },
  noDataText: { color: "rgba(255,255,255,0.6)", fontSize: 12, marginTop: 6, lineHeight: 17 },
  meta: { color: "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: "500", marginTop: 8 },
});

// ─── Onboarding checklist ─────────────────────────────────────────────────────

type CheckStep = { id: string; label: string; done: boolean; hint: string; route: string };

function OnboardingChecklist({
  steps,
  onPress,
}: {
  steps: CheckStep[];
  onPress: (route: string) => void;
}) {
  const done = steps.filter((s) => s.done).length;
  const pct = Math.round((done / steps.length) * 100);

  return (
    <View style={obStyles.card}>
      <View style={obStyles.header}>
        <View style={obStyles.headerText}>
          <Text style={obStyles.title}>Configura tu restaurante</Text>
          <Text style={obStyles.subtitle}>{done}/{steps.length} pasos completados</Text>
        </View>
        <View style={obStyles.pctCircle}>
          <Text style={obStyles.pctText}>{pct}%</Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={obStyles.barBg}>
        <View style={[obStyles.barFill, { width: `${pct}%` as `${number}%` }]} />
      </View>

      <View style={obStyles.steps}>
        {steps.map((step) => (
          <Pressable
            key={step.id}
            style={({ pressed }) => [obStyles.step, pressed && { opacity: 0.75 }]}
            onPress={() => !step.done && onPress(step.route)}
            disabled={step.done}
          >
            <View style={[obStyles.stepIcon, step.done && obStyles.stepIconDone]}>
              <Ionicons
                name={step.done ? "checkmark" : "ellipse-outline"}
                size={14}
                color={step.done ? "#FFFFFF" : C.TEXT_TERTIARY}
              />
            </View>
            <View style={obStyles.stepBody}>
              <Text style={[obStyles.stepLabel, step.done && obStyles.stepLabelDone]}>
                {step.label}
              </Text>
              {!step.done && <Text style={obStyles.stepHint}>{step.hint}</Text>}
            </View>
            {!step.done && (
              <Ionicons name="chevron-forward" size={15} color={C.TEXT_TERTIARY} />
            )}
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const obStyles = StyleSheet.create({
  card: {
    backgroundColor: C.BG_CARD,
    borderRadius: RADIUS.lg,
    padding: 18,
    ...SHADOW.sm,
    borderWidth: 1,
    borderColor: C.VIOLET_BORDER,
    marginBottom: 0,
  },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  headerText: { flex: 1 },
  title: { color: C.TEXT_PRIMARY, fontSize: 15, fontWeight: "800" },
  subtitle: { color: C.TEXT_SECONDARY, fontSize: 12, marginTop: 2 },
  pctCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: C.VIOLET_SUBTLE,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: C.VIOLET_BORDER,
  },
  pctText: { color: C.VIOLET_PRIMARY, fontSize: 12, fontWeight: "800" },
  barBg: { height: 4, backgroundColor: C.BORDER, borderRadius: 2, marginBottom: 16 },
  barFill: { height: 4, backgroundColor: C.VIOLET_PRIMARY, borderRadius: 2 },
  steps: { gap: 10 },
  step: { flexDirection: "row", alignItems: "center", gap: 10 },
  stepIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: C.BG_INPUT,
    borderWidth: 1.5,
    borderColor: C.BORDER,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  stepIconDone: { backgroundColor: C.GREEN_POSITIVE, borderColor: C.GREEN_POSITIVE },
  stepBody: { flex: 1 },
  stepLabel: { color: C.TEXT_PRIMARY, fontSize: 14, fontWeight: "600" },
  stepLabelDone: { color: C.TEXT_TERTIARY, textDecorationLine: "line-through" },
  stepHint: { color: C.TEXT_TERTIARY, fontSize: 11, marginTop: 1 },
});

// ─── Quick action button ──────────────────────────────────────────────────────

function QuickAction({
  icon,
  label,
  onPress,
  primary = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  primary?: boolean;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        qaStyles.btn,
        primary && qaStyles.btnPrimary,
        pressed && { opacity: 0.75, transform: [{ scale: 0.96 }] },
      ]}
      onPress={onPress}
    >
      <View style={[qaStyles.iconCircle, primary && qaStyles.iconCirclePrimary]}>
        <Ionicons name={icon} size={20} color={primary ? "#FFFFFF" : C.VIOLET_PRIMARY} />
      </View>
      <Text style={[qaStyles.label, primary && qaStyles.labelPrimary]}>{label}</Text>
    </Pressable>
  );
}

const qaStyles = StyleSheet.create({
  btn: {
    flex: 1,
    minWidth: 72,
    backgroundColor: C.BG_CARD,
    borderRadius: RADIUS.md,
    padding: 14,
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: C.BORDER,
    ...SHADOW.sm,
  },
  btnPrimary: {
    backgroundColor: C.VIOLET_EXTRA_LIGHT,
    borderColor: C.VIOLET_BORDER,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.VIOLET_SUBTLE,
    alignItems: "center",
    justifyContent: "center",
  },
  iconCirclePrimary: { backgroundColor: C.VIOLET_PRIMARY },
  label: { color: C.TEXT_SECONDARY, fontSize: 11, fontWeight: "600", textAlign: "center" },
  labelPrimary: { color: C.VIOLET_DARK, fontWeight: "700" },
});

// ─── Tip row ──────────────────────────────────────────────────────────────────

function TipRow({ tip }: { tip: TipItem }) {
  return (
    <View style={tipStyles.row}>
      <View style={tipStyles.icon}>
        <Ionicons name="checkmark" size={14} color={C.GREEN_POSITIVE} />
      </View>
      <View style={tipStyles.info}>
        <Text style={tipStyles.employee}>{tip.employeeName}</Text>
        <Text style={tipStyles.time}>{timeAgo(tip.createdAt)}</Text>
      </View>
      <Text style={tipStyles.amount}>+{tip.amount.toFixed(2)} €</Text>
    </View>
  );
}

const tipStyles = StyleSheet.create({
  row: {
    backgroundColor: C.BG_CARD,
    borderRadius: RADIUS.md,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    ...SHADOW.sm,
    borderWidth: 1,
    borderColor: C.BORDER,
  },
  icon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: C.GREEN_SUBTLE,
    alignItems: "center",
    justifyContent: "center",
  },
  info: { flex: 1 },
  employee: { color: C.TEXT_PRIMARY, fontSize: 14, fontWeight: "700" },
  time: { color: C.TEXT_TERTIARY, fontSize: 12, marginTop: 2 },
  amount: { color: C.GREEN_POSITIVE, fontWeight: "800", fontSize: 15 },
});

// ─── Summary mini row ─────────────────────────────────────────────────────────

function SummaryRow({
  todayTotal,
  employeeCount,
  stripeOk,
}: {
  todayTotal: number;
  employeeCount: number;
  stripeOk: boolean;
}) {
  return (
    <View style={srStyles.row}>
      <View style={srStyles.item}>
        <Text style={srStyles.value}>{todayTotal.toFixed(2)} €</Text>
        <Text style={srStyles.label}>Hoy</Text>
      </View>
      <View style={srStyles.divider} />
      <View style={srStyles.item}>
        <Text style={srStyles.value}>{employeeCount}</Text>
        <Text style={srStyles.label}>Empleados</Text>
      </View>
      <View style={srStyles.divider} />
      <View style={srStyles.item}>
        <View style={srStyles.statusRow}>
          <View style={[srStyles.dot, { backgroundColor: stripeOk ? C.GREEN_POSITIVE : C.WARNING }]} />
          <Text style={srStyles.value}>{stripeOk ? "Activo" : "Pendiente"}</Text>
        </View>
        <Text style={srStyles.label}>Pagos</Text>
      </View>
    </View>
  );
}

const srStyles = StyleSheet.create({
  row: {
    backgroundColor: C.BG_CARD,
    borderRadius: RADIUS.md,
    padding: 16,
    flexDirection: "row",
    ...SHADOW.sm,
    borderWidth: 1,
    borderColor: C.BORDER,
  },
  item: { flex: 1, alignItems: "center" },
  value: { color: C.TEXT_PRIMARY, fontSize: 16, fontWeight: "800" },
  label: { color: C.TEXT_TERTIARY, fontSize: 11, fontWeight: "600", marginTop: 3, textTransform: "uppercase", letterSpacing: 0.3 },
  divider: { width: 1, backgroundColor: C.BORDER, marginVertical: 4 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  dot: { width: 7, height: 7, borderRadius: 4 },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [period, setPeriod] = useState<StatPeriod>("week");
  const [restaurant, setRestaurant] = useState<RestaurantData | null>(null);
  const [tips, setTips] = useState<TipItem[]>([]);
  const [employeeCount, setEmployeeCount] = useState(0);
  const [loadingRestaurant, setLoadingRestaurant] = useState(true);
  const [loadingTips, setLoadingTips] = useState(true);

  useEffect(() => {
    // ── Demo mode ──────────────────────────────────────────────────────────
    if (IS_DEMO) {
      setRestaurant(DEMO_RESTAURANT);
      setTips(DEMO_TIPS as unknown as TipItem[]);
      setEmployeeCount(DEMO_EMPLOYEES.filter((e) => e.status === "active").length);
      setLoadingRestaurant(false);
      setLoadingTips(false);
      return;
    }

    // ── Real Firebase data ─────────────────────────────────────────────────
    const user = auth.currentUser;
    if (!user) {
      setLoadingRestaurant(false);
      setLoadingTips(false);
      return;
    }

    const loadData = async () => {
      try {
        const snap = await getDoc(doc(db, "restaurants", user.uid));
        if (snap.exists()) {
          const d = snap.data();
          setRestaurant({
            name: d.name ?? "",
            address: d.address ?? "",
            stripe_onboarding_complete: d.stripe_onboarding_complete ?? false,
            stripe_account_id: d.stripe_account_id ?? "",
          });
        }
        setLoadingRestaurant(false);

        // Employee count
        const empSnap = await getDocs(
          query(
            collection(db, "restaurants", user.uid, "employees"),
            where("status", "==", "active")
          )
        );
        setEmployeeCount(empSnap.size);

        // Tips
        const tipsSnap = await getDocs(
          query(
            collection(db, "tips"),
            where("restaurantId", "==", user.uid),
            orderBy("createdAt", "desc")
          )
        );
        setTips(
          tipsSnap.docs.map((d) => ({
            id: d.id,
            amount: Number(d.data().amount ?? 0),
            employeeName: d.data().employeeName ?? "Anónimo",
            status: d.data().status ?? "paid",
            isTest: d.data().isTest ?? false,
            createdAt: d.data().createdAt ?? null,
            restaurantId: d.data().restaurantId ?? "",
          }))
        );
      } catch (error: unknown) {
        const e = error as { code?: string };
        if (e?.code === "failed-precondition") {
          console.warn("Crea índice en Firestore: restaurantId + createdAt (desc)");
        }
      } finally {
        setLoadingRestaurant(false);
        setLoadingTips(false);
      }
    };

    loadData();
  }, []);

  // ── Derived values ─────────────────────────────────────────────────────────

  const todayStats = useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const real = tips.filter((t) => t.status !== "failed" && !t.isTest);
    const todayTips = real.filter((t) => {
      const d = t.createdAt?.toDate?.();
      return d && d >= start;
    });
    return todayTips.reduce((s, t) => s + t.amount, 0);
  }, [tips]);

  const lastTips = useMemo(
    () => tips.filter((t) => t.status !== "failed" && !t.isTest).slice(0, 5),
    [tips]
  );

  const stripeOk = Boolean(
    IS_DEMO
      ? DEMO_RESTAURANT.stripe_onboarding_complete
      : restaurant?.stripe_onboarding_complete
  );

  const onboardingSteps: CheckStep[] = useMemo(() => {
    if (!restaurant) return [];
    return [
      {
        id: "restaurant",
        label: "Información del restaurante",
        done: Boolean(restaurant.name),
        hint: "Añade el nombre y dirección de tu local",
        route: "/setup-restaurant",
      },
      {
        id: "stripe",
        label: "Conectar cuenta de cobros",
        done: stripeOk,
        hint: "Necesario para recibir propinas reales",
        route: "/settings/bank",
      },
      {
        id: "employees",
        label: "Añadir empleados",
        done: employeeCount > 0,
        hint: "Los clientes podrán elegir a quién dar la propina",
        route: "/settings/employees",
      },
    ];
  }, [restaurant, stripeOk, employeeCount]);

  const isOnboardingComplete =
    IS_DEMO || onboardingSteps.length === 0 || onboardingSteps.every((s) => s.done);

  const restaurantName =
    loadingRestaurant ? "" : (IS_DEMO ? DEMO_RESTAURANT.name : restaurant?.name || "Mi Restaurante");
  const initials = restaurantName ? getInitials(restaurantName) : "Q";
  const topPad = insets.top > 0 ? insets.top + 8 : 28;

  // ── Skeleton ───────────────────────────────────────────────────────────────

  if (loadingRestaurant) {
    return (
      <View style={styles.screen}>
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingTop: topPad }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.container}>
            <HomeHeaderSkeleton />
            <Skeleton width="100%" height={200} radius={20} style={{ marginTop: 20 }} />
            <View style={styles.cardsRow}>
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ── Main render ────────────────────────────────────────────────────────────

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: topPad }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          {/* ── Header ────────────────────────────────────────────────────── */}
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.greeting}>{getGreeting()}</Text>
              <View style={styles.nameRow}>
                <Text style={styles.title} numberOfLines={1}>{restaurantName}</Text>
                <DemoChip />
              </View>
              {(IS_DEMO ? DEMO_RESTAURANT.address : restaurant?.address) ? (
                <Text style={styles.address} numberOfLines={1}>
                  {IS_DEMO ? DEMO_RESTAURANT.address : restaurant?.address}
                </Text>
              ) : null}
            </View>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          </View>

          {/* ── Onboarding checklist ──────────────────────────────────────── */}
          {!isOnboardingComplete && (
            <View style={styles.block}>
              <OnboardingChecklist
                steps={onboardingSteps}
                onPress={(route) => router.push(route as never)}
              />
            </View>
          )}

          {/* ── Premium summary card ──────────────────────────────────────── */}
          <View style={styles.block}>
            <PremiumSummaryCard
              tips={loadingTips ? [] : tips}
              period={period}
              onPeriodChange={setPeriod}
              loading={loadingTips}
            />
          </View>

          {/* ── Summary mini row ──────────────────────────────────────────── */}
          <View style={styles.block}>
            <SummaryRow
              todayTotal={loadingTips ? 0 : todayStats}
              employeeCount={employeeCount}
              stripeOk={stripeOk}
            />
          </View>

          {/* ── Quick actions ─────────────────────────────────────────────── */}
          <Text style={styles.sectionBadge}>Acciones rápidas</Text>
          <View style={styles.quickRow}>
            <QuickAction
              icon="qr-code-outline"
              label="Compartir QR"
              onPress={() => router.push("/qr")}
              primary
            />
            <QuickAction
              icon="receipt-outline"
              label="Movimientos"
              onPress={() => router.push("/movements")}
            />
            <QuickAction
              icon="people-outline"
              label="Empleados"
              onPress={() => router.push("/settings/employees")}
            />
            <QuickAction
              icon="bar-chart-outline"
              label="Estadísticas"
              onPress={() => router.push("/stats")}
            />
          </View>

          {/* ── Recent tips ───────────────────────────────────────────────── */}
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Últimas propinas</Text>
              <Text style={styles.sectionHint}>Solo propinas reales</Text>
            </View>
            <Pressable
              onPress={() => router.push("/movements")}
              style={({ pressed }) => [styles.sectionLink, pressed && { opacity: 0.7 }]}
            >
              <Text style={styles.sectionLinkText}>Ver todas</Text>
              <Ionicons name="chevron-forward" size={13} color={C.VIOLET_PRIMARY} />
            </Pressable>
          </View>

          <View style={styles.list}>
            {loadingTips ? (
              <View style={tipStyles.row}>
                <Skeleton width={28} height={28} radius={14} />
                <View style={{ flex: 1, gap: 6 }}>
                  <Skeleton width="55%" height={14} />
                  <Skeleton width="35%" height={11} />
                </View>
                <Skeleton width={50} height={14} />
              </View>
            ) : lastTips.length === 0 ? (
              <View style={styles.emptyTips}>
                <Ionicons name="receipt-outline" size={32} color={C.BORDER} />
                <Text style={styles.emptyTitle}>Todavía no hay propinas</Text>
                <Text style={styles.emptyText}>
                  Comparte tu QR y empieza a recibir propinas digitales.
                </Text>
                <Pressable
                  style={({ pressed }) => [styles.emptyBtn, pressed && { opacity: 0.8 }]}
                  onPress={() => router.push("/qr")}
                >
                  <Text style={styles.emptyBtnText}>Compartir mi QR</Text>
                </Pressable>
              </View>
            ) : (
              lastTips.map((t) => <TipRow key={t.id} tip={t} />)
            )}
          </View>

          <View style={{ height: 24 }} />
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.BG_SCREEN },
  scrollContent: { paddingHorizontal: 18, alignItems: "center", paddingBottom: 32 },
  container: { width: "100%", maxWidth: 520 },

  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 },
  headerText: { flex: 1, marginRight: 12 },
  greeting: { color: C.TEXT_SECONDARY, fontSize: 14, fontWeight: "500", marginBottom: 3 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  title: { color: C.TEXT_PRIMARY, fontSize: 24, fontWeight: "800" },
  address: { color: C.TEXT_TERTIARY, marginTop: 4, fontSize: 13 },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: C.VIOLET_PRIMARY,
    alignItems: "center", justifyContent: "center",
    ...SHADOW.violetSm,
  },
  avatarText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },

  block: { marginTop: 16 },

  sectionBadge: { color: C.TEXT_TERTIARY, fontSize: 10, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase", marginTop: 24, marginBottom: 12 },

  cardsRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  quickRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },

  sectionHeader: { flexDirection: "row", justifyContent: "space-between", marginTop: 28, marginBottom: 14, alignItems: "center" },
  sectionTitle: { color: C.TEXT_PRIMARY, fontSize: 18, fontWeight: "800" },
  sectionHint: { color: C.TEXT_TERTIARY, fontSize: 12, marginTop: 3 },
  sectionLink: { flexDirection: "row", alignItems: "center", gap: 2 },
  sectionLinkText: { color: C.VIOLET_PRIMARY, fontSize: 13, fontWeight: "700" },

  list: { gap: 10 },

  emptyTips: {
    backgroundColor: C.BG_CARD,
    borderRadius: RADIUS.lg,
    padding: 28,
    alignItems: "center",
    gap: 8,
    ...SHADOW.sm,
    borderWidth: 1,
    borderColor: C.BORDER,
  },
  emptyTitle: { color: C.TEXT_PRIMARY, fontSize: 16, fontWeight: "800", textAlign: "center", marginTop: 8 },
  emptyText: { color: C.TEXT_SECONDARY, fontSize: 13, textAlign: "center", lineHeight: 20, maxWidth: 260 },
  emptyBtn: {
    marginTop: 8,
    backgroundColor: C.VIOLET_PRIMARY,
    borderRadius: RADIUS.sm,
    paddingVertical: 11,
    paddingHorizontal: 24,
  },
  emptyBtnText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
});
