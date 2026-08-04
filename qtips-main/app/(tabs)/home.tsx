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
import { HomeHeaderSkeleton, Skeleton, StatCardSkeleton } from "../../components/ui/Skeleton";
import { C, RADIUS, SHADOW } from "../../constants/theme";
import { auth, db } from "../../lib/firebase";

// ─── Types ────────────────────────────────────────────────────────────────────

type TipItem = {
  id: string;
  amount: number;
  employeeName: string;
  status: string;
  isTest: boolean;
  createdAt?: { toDate?: () => Date };
  restaurantId: string;
};

type Restaurant = { name: string; address: string };

const DAY_LABELS = ["D", "L", "M", "X", "J", "V", "S"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 14) return "Buenos días";
  if (h < 21) return "Buenas tardes";
  return "Buenas noches";
}

function timeAgo(createdAt?: { toDate?: () => Date }): string {
  if (!createdAt?.toDate) return "hace un rato";
  const diff = Date.now() - createdAt.toDate().getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "hace unos segundos";
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.floor(h / 24)} d`;
}

// ─── Mini sparkline (last 7 days) ────────────────────────────────────────────

function MiniSparkline({ tips }: { tips: TipItem[] }) {
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
          if (!t.createdAt?.toDate) return false;
          const d = t.createdAt.toDate();
          return d >= day && d <= dayEnd;
        })
        .reduce((s, t) => s + t.amount, 0);
      return { label: DAY_LABELS[day.getDay()], value };
    });
  }, [tips]);

  const maxVal = Math.max(...data.map((d) => d.value), 0.01);
  const MAX_H = 36;

  return (
    <View style={sparkStyles.wrap}>
      <Text style={sparkStyles.label}>Últimos 7 días</Text>
      <View style={sparkStyles.chart}>
        {data.map((item, i) => {
          const barH = Math.max((item.value / maxVal) * MAX_H, item.value > 0 ? 3 : 2);
          return (
            <View key={i} style={sparkStyles.barCol}>
              <View style={sparkStyles.barBg}>
                <View
                  style={[
                    sparkStyles.bar,
                    {
                      height: barH,
                      backgroundColor: item.value > 0 ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.25)",
                    },
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
  wrap: { paddingTop: 14 },
  label: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  chart: { flexDirection: "row", gap: 6, alignItems: "flex-end" },
  barCol: { flex: 1, alignItems: "center", gap: 4 },
  barBg: { height: 40, justifyContent: "flex-end" },
  bar: { width: "100%", maxWidth: 22, borderRadius: 4 },
  barLabel: { color: "rgba(255,255,255,0.55)", fontSize: 9, fontWeight: "600" },
});

// ─── Quick Action button ──────────────────────────────────────────────────────

function QuickAction({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.quickBtn, pressed && { opacity: 0.75, transform: [{ scale: 0.96 }] }]}
      onPress={onPress}
    >
      <View style={styles.quickIconCircle}>
        <Ionicons name={icon} size={20} color={C.VIOLET_PRIMARY} />
      </View>
      <Text style={styles.quickLabel}>{label}</Text>
    </Pressable>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loadingRestaurant, setLoadingRestaurant] = useState(true);
  const [loadingTips, setLoadingTips] = useState(true);
  const [tips, setTips] = useState<TipItem[]>([]);

  useEffect(() => {
    const loadHomeData = async () => {
      const user = auth.currentUser;
      if (!user) {
        setLoadingRestaurant(false);
        setLoadingTips(false);
        return;
      }

      try {
        const restaurantSnap = await getDoc(doc(db, "restaurants", user.uid));
        if (restaurantSnap.exists()) {
          const d = restaurantSnap.data();
          setRestaurant({ name: d.name ?? "", address: d.address ?? "" });
        }
        setLoadingRestaurant(false);

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
            createdAt: d.data().createdAt,
            restaurantId: d.data().restaurantId ?? "",
          }))
        );
      } catch (error: unknown) {
        const e = error as { code?: string };
        if (e?.code === "failed-precondition") {
          console.warn("Crea un índice en Firestore: restaurantId + createdAt (desc)");
        }
      } finally {
        setLoadingRestaurant(false);
        setLoadingTips(false);
      }
    };

    loadHomeData();
  }, []);

  // ── Stats ──────────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const now = new Date();

    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const weekStart = new Date(now);
    const dow = weekStart.getDay();
    weekStart.setDate(weekStart.getDate() - (dow === 0 ? 6 : dow - 1));
    weekStart.setHours(0, 0, 0, 0);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    let today = 0, week = 0, month = 0;

    const real = tips.filter((t) => t.status !== "failed" && !t.isTest);

    real.forEach((tip) => {
      const amt = Number(tip.amount ?? 0);
      if (!isFinite(amt) || isNaN(amt)) return;
      if (!tip.createdAt?.toDate) return;
      try {
        const d = tip.createdAt.toDate();
        if (d >= todayStart) today += amt;
        if (d >= weekStart)  week  += amt;
        if (d >= monthStart) month += amt;
      } catch { /* skip invalid timestamps */ }
    });

    const total = real.reduce((s, t) => s + Number(t.amount ?? 0), 0);
    const avg   = real.length > 0 ? total / real.length : 0;

    return {
      today:  isFinite(today) ? today : 0,
      week:   isFinite(week)  ? week  : 0,
      month:  isFinite(month) ? month : 0,
      total:  isFinite(total) ? total : 0,
      avg:    isFinite(avg)   ? avg   : 0,
      count:  real.length,
    };
  }, [tips]);

  const lastTips = useMemo(
    () => tips.filter((t) => t.status !== "failed" && !t.isTest).slice(0, 5),
    [tips]
  );

  const restaurantName = loadingRestaurant
    ? ""
    : restaurant?.name || "Mi Restaurante";
  const initials = restaurant?.name ? getInitials(restaurant.name) : "Q";

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
            <View style={{ marginTop: 20 }}>
              <Skeleton width={100} height={10} style={{ marginBottom: 14 }} />
            </View>
            {/* Primary card skeleton */}
            <View style={[styles.card, styles.cardPrimary, { paddingBottom: 22 }]}>
              <Skeleton width="45%" height={10} style={{ opacity: 0.4 }} />
              <Skeleton width="70%" height={40} radius={8} style={{ marginTop: 10, opacity: 0.4 }} />
            </View>
            {/* Secondary row skeleton */}
            <View style={[styles.cardsRow, { marginTop: 12 }]}>
              <StatCardSkeleton />
              <StatCardSkeleton />
            </View>
            <View style={[styles.cardsRow, { marginTop: 12 }]}>
              <StatCardSkeleton />
              <StatCardSkeleton />
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: topPad }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          {/* ── Header ──────────────────────────────────────────────────── */}
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.greeting}>{getGreeting()}</Text>
              <Text style={styles.title} numberOfLines={1}>
                {restaurantName}
              </Text>
              {restaurant?.address ? (
                <Text style={styles.address} numberOfLines={1}>
                  {restaurant.address}
                </Text>
              ) : null}
            </View>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          </View>

          <Text style={styles.sectionBadge}>Resumen</Text>

          {/* ── Primary card ───────────────────────────────────────────── */}
          <View style={[styles.card, styles.cardPrimary]}>
            <View style={styles.cardRow}>
              <Text style={styles.cardLabelPrimary}>Propinas hoy</Text>
              <View style={styles.cardBadge}>
                <Ionicons name="trending-up" size={13} color={C.GREEN_POSITIVE} />
              </View>
            </View>
            <Text style={styles.cardValuePrimary}>
              {loadingTips ? "—" : `${stats.today.toFixed(2)} €`}
            </Text>
            {!loadingTips && (
              <MiniSparkline tips={tips} />
            )}
          </View>

          {/* ── Secondary row ──────────────────────────────────────────── */}
          <View style={styles.cardsRow}>
            <View style={[styles.card, styles.cardSecondary]}>
              <Text style={styles.cardLabel}>Esta semana</Text>
              <Text style={styles.cardValue}>
                {loadingTips ? "—" : `${stats.week.toFixed(2)} €`}
              </Text>
            </View>
            <View style={[styles.card, styles.cardSecondary]}>
              <Text style={styles.cardLabel}>Este mes</Text>
              <Text style={styles.cardValue}>
                {loadingTips ? "—" : `${stats.month.toFixed(2)} €`}
              </Text>
            </View>
          </View>

          {/* ── Tertiary row ───────────────────────────────────────────── */}
          <View style={styles.cardsRow}>
            <View style={[styles.card, styles.cardSecondary]}>
              <Text style={styles.cardLabel}>Propinas</Text>
              <Text style={styles.cardValue}>
                {loadingTips ? "—" : String(stats.count)}
              </Text>
            </View>
            <View style={[styles.card, styles.cardSecondary]}>
              <Text style={styles.cardLabel}>Media</Text>
              <Text style={styles.cardValue}>
                {loadingTips ? "—" : stats.count > 0 ? `${stats.avg.toFixed(2)} €` : "—"}
              </Text>
            </View>
          </View>

          {/* ── Quick actions ──────────────────────────────────────────── */}
          <Text style={[styles.sectionBadge, { marginTop: 28 }]}>Acciones rápidas</Text>
          <View style={styles.quickRow}>
            <QuickAction
              icon="qr-code-outline"
              label="Ver QR"
              onPress={() => router.push("/qr")}
            />
            <QuickAction
              icon="receipt-outline"
              label="Movimientos"
              onPress={() => router.push("/movements")}
            />
            <QuickAction
              icon="bar-chart-outline"
              label="Estadísticas"
              onPress={() => router.push("/stats")}
            />
            <QuickAction
              icon="settings-outline"
              label="Ajustes"
              onPress={() => router.push("/settings")}
            />
          </View>

          {/* ── Recent tips ────────────────────────────────────────────── */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Últimas propinas</Text>
                <Text style={styles.sectionHint}>Solo propinas reales completadas</Text>
              </View>
              <Pressable
                onPress={() => router.push("/movements")}
                style={({ pressed }) => [styles.sectionLinkBtn, pressed && { opacity: 0.7 }]}
              >
                <Text style={styles.sectionLink}>Ver todas</Text>
                <Ionicons name="chevron-forward" size={13} color={C.VIOLET_PRIMARY} />
              </Pressable>
            </View>

            <View style={styles.list}>
              {loadingTips ? (
                <View style={styles.tipRow}>
                  <Skeleton width={28} height={28} radius={14} />
                  <View style={{ flex: 1, gap: 6 }}>
                    <Skeleton width="55%" height={14} />
                    <Skeleton width="35%" height={11} />
                  </View>
                  <Skeleton width={50} height={14} />
                </View>
              ) : lastTips.length === 0 ? (
                <View style={[styles.tipRow, styles.tipEmpty]}>
                  <Ionicons name="receipt-outline" size={28} color={C.BORDER} />
                  <Text style={[styles.tipMeta, { marginTop: 8, textAlign: "center" }]}>
                    Comparte tu QR y empieza a recibir propinas.
                  </Text>
                </View>
              ) : (
                lastTips.map((t) => (
                  <View key={t.id} style={styles.tipRow}>
                    <View style={styles.tipIcon}>
                      <Ionicons name="checkmark" size={14} color={C.GREEN_POSITIVE} />
                    </View>
                    <View style={styles.tipInfo}>
                      <Text style={styles.tipEmployee}>{t.employeeName}</Text>
                      <Text style={styles.tipTime}>{timeAgo(t.createdAt)}</Text>
                    </View>
                    <Text style={styles.tipAmount}>+{t.amount.toFixed(2)} €</Text>
                  </View>
                ))
              )}
            </View>
          </View>

          {/* ── QR shortcut ────────────────────────────────────────────── */}
          <Pressable
            onPress={() => router.push("/qr")}
            style={({ pressed }) => [
              styles.qrCard,
              pressed && { transform: [{ scale: 0.97 }], opacity: 0.95 },
            ]}
          >
            <View style={styles.qrCardContent}>
              <View style={styles.qrIconCircle}>
                <Ionicons name="qr-code" size={26} color={C.VIOLET_PRIMARY} />
              </View>
              <View style={styles.qrTextBlock}>
                <Text style={styles.qrTitle}>Tu QR está listo</Text>
                <Text style={styles.qrSubtitle}>
                  Muéstralo y empieza a recibir propinas digitales
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={C.VIOLET_LIGHT} />
            </View>
          </Pressable>

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

  // Header
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 },
  headerText: { flex: 1, marginRight: 12 },
  greeting: { color: C.TEXT_SECONDARY, fontSize: 14, fontWeight: "500", marginBottom: 2 },
  title: { color: C.TEXT_PRIMARY, fontSize: 26, fontWeight: "800" },
  address: { color: C.TEXT_TERTIARY, marginTop: 4, fontSize: 13 },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: C.VIOLET_PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    ...SHADOW.violetSm,
  },
  avatarText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },

  sectionBadge: {
    color: C.TEXT_TERTIARY,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginTop: 20,
    marginBottom: 12,
  },

  // Cards
  cardsRow: { flexDirection: "row", gap: 10, marginTop: 10 },
  card: { borderRadius: RADIUS.lg, padding: 18, ...SHADOW.md },
  cardPrimary: { backgroundColor: C.VIOLET_PRIMARY, marginTop: 0 },
  cardSecondary: {
    flex: 1,
    backgroundColor: C.BG_CARD,
    borderWidth: 1,
    borderColor: C.BORDER,
  },
  cardRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  cardLabelPrimary: { color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  cardBadge: { backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 8, padding: 5 },
  cardValuePrimary: { color: "#FFFFFF", fontSize: 36, fontWeight: "800" },
  cardLabel: { color: C.TEXT_TERTIARY, fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 },
  cardValue: { color: C.TEXT_PRIMARY, fontSize: 22, fontWeight: "800" },

  // Quick actions
  quickRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  quickBtn: {
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
  quickIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.VIOLET_SUBTLE,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: C.VIOLET_BORDER,
  },
  quickLabel: { color: C.TEXT_SECONDARY, fontSize: 11, fontWeight: "600", textAlign: "center" },

  // Section
  section: { marginTop: 28 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 14, gap: 12, alignItems: "center" },
  sectionTitle: { color: C.TEXT_PRIMARY, fontSize: 18, fontWeight: "800" },
  sectionHint: { color: C.TEXT_TERTIARY, fontSize: 12, marginTop: 3 },
  sectionLinkBtn: { flexDirection: "row", alignItems: "center", gap: 2 },
  sectionLink: { color: C.VIOLET_PRIMARY, fontSize: 13, fontWeight: "700" },

  // Tips list
  list: { gap: 10 },
  tipRow: {
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
  tipEmpty: { flexDirection: "column", alignItems: "center", paddingVertical: 24 },
  tipIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(32,214,155,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  tipInfo: { flex: 1 },
  tipEmployee: { color: C.TEXT_PRIMARY, fontSize: 14, fontWeight: "700" },
  tipTime: { color: C.TEXT_TERTIARY, fontSize: 12, marginTop: 2 },
  tipAmount: { color: C.GREEN_POSITIVE, fontWeight: "800", fontSize: 15 },
  tipMeta: { color: C.TEXT_TERTIARY, fontSize: 13 },

  // QR shortcut card
  qrCard: {
    marginTop: 22,
    borderRadius: RADIUS.lg,
    backgroundColor: C.VIOLET_SUBTLE,
    borderWidth: 1.5,
    borderColor: C.VIOLET_BORDER,
    padding: 18,
    ...SHADOW.sm,
  },
  qrCardContent: { flexDirection: "row", alignItems: "center", gap: 14 },
  qrIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    ...SHADOW.sm,
  },
  qrTextBlock: { flex: 1 },
  qrTitle: { color: C.VIOLET_DARK, fontWeight: "800", fontSize: 15 },
  qrSubtitle: { color: C.VIOLET_LIGHT, fontSize: 12, marginTop: 4, lineHeight: 17 },
});
