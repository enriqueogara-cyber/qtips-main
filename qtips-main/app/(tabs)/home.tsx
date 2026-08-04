import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { collection, doc, getDoc, getDocs, orderBy, query, where } from "firebase/firestore";
import React, { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { auth, db } from "../../lib/firebase";
import { C, SHADOW } from "../../constants/theme";

type TipItem = {
  id: string;
  amount: number;
  employeeName: string;
  createdAt?: any;
  restaurantId: string;
};

type Restaurant = {
  name: string;
  address: string;
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export default function HomeScreen() {
  const router = useRouter();

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
        const restaurantRef = doc(db, "restaurants", user.uid);
        const restaurantSnap = await getDoc(restaurantRef);

        if (restaurantSnap.exists()) {
          const data = restaurantSnap.data();
          setRestaurant({
            name: data.name ?? "",
            address: data.address ?? "",
          });
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
            createdAt: d.data().createdAt,
            restaurantId: d.data().restaurantId ?? "",
          }))
        );
      } catch (error: any) {
        if (error?.code === "failed-precondition") {
          console.warn("Necesitas crear un indice en Firestore: restaurantId + createdAt (desc)");
        }
      } finally {
        setLoadingRestaurant(false);
        setLoadingTips(false);
      }
    };

    loadHomeData();
  }, []);

  const stats = useMemo(() => {
    const now = new Date();

    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const startOfWeek = new Date(now);
    const day = startOfWeek.getDay();
    const diffToMonday = day === 0 ? 6 : day - 1;
    startOfWeek.setDate(startOfWeek.getDate() - diffToMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    let today = 0;
    let week = 0;
    let month = 0;

    tips.forEach((tip) => {
      const amount = Number(tip.amount ?? 0);
      if (!tip.createdAt?.toDate) return;
      const tipDate = tip.createdAt.toDate();
      if (tipDate >= startOfToday) today += amount;
      if (tipDate >= startOfWeek) week += amount;
      if (tipDate >= startOfMonth) month += amount;
    });

    return { today, week, month };
  }, [tips]);

  const lastTips = useMemo(() => tips.slice(0, 5), [tips]);

  const formatMinutesAgo = (createdAt: any) => {
    if (!createdAt?.toDate) return "hace un rato";
    const tipDate = createdAt.toDate();
    const now = new Date();
    const diffMs = now.getTime() - tipDate.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    if (diffMinutes < 1) return "hace unos segundos";
    if (diffMinutes < 60) return `hace ${diffMinutes} min`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `hace ${diffHours} h`;
    const diffDays = Math.floor(diffHours / 24);
    return `hace ${diffDays} d`;
  };

  const restaurantName = loadingRestaurant
    ? "Cargando..."
    : restaurant?.name || "Mi Restaurante";

  const initials = restaurant?.name ? getInitials(restaurant.name) : "Q";

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          {/* ── Header ─────────────────────────────────────────────── */}
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.greeting}>¡Hola!</Text>
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

          {/* ── Stats cards ────────────────────────────────────────── */}
          <View style={styles.cardsStack}>
            {/* Primary — "Hoy" */}
            <View style={[styles.card, styles.cardPrimary]}>
              <View style={styles.cardRow}>
                <Text style={styles.cardLabelPrimary}>Propinas hoy</Text>
                <View style={styles.cardBadge}>
                  <Ionicons name="trending-up" size={14} color={C.GREEN_POSITIVE} />
                </View>
              </View>
              <Text style={styles.cardValuePrimary}>
                {loadingTips ? "..." : `${stats.today} €`}
              </Text>
            </View>

            {/* Secondary row */}
            <View style={styles.cardsRow}>
              <View style={[styles.card, styles.cardSecondary]}>
                <Text style={styles.cardLabel}>Esta semana</Text>
                <Text style={styles.cardValue}>
                  {loadingTips ? "..." : `${stats.week} €`}
                </Text>
              </View>

              <View style={[styles.card, styles.cardSecondary]}>
                <Text style={styles.cardLabel}>Este mes</Text>
                <Text style={styles.cardValue}>
                  {loadingTips ? "..." : `${stats.month} €`}
                </Text>
              </View>
            </View>
          </View>

          {/* ── Recent tips ────────────────────────────────────────── */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Últimas propinas</Text>
                <Text style={styles.sectionHint}>
                  Las más recientes de tu restaurante
                </Text>
              </View>

              <Pressable
                onPress={() => router.push("/stats")}
                style={({ pressed }) => [
                  styles.sectionLinkBtn,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text style={styles.sectionLink}>Ver todas</Text>
                <Ionicons name="chevron-forward" size={13} color={C.VIOLET_PRIMARY} />
              </Pressable>
            </View>

            <View style={styles.list}>
              {loadingTips ? (
                <View style={styles.tipRow}>
                  <Text style={styles.tipMeta}>Cargando propinas...</Text>
                </View>
              ) : lastTips.length === 0 ? (
                <View style={[styles.tipRow, styles.tipEmpty]}>
                  <Ionicons name="receipt-outline" size={28} color={C.BORDER} />
                  <Text style={[styles.tipMeta, { marginTop: 8, textAlign: "center" }]}>
                    Todavía no hay propinas registradas.
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
                      <Text style={styles.tipTime}>{formatMinutesAgo(t.createdAt)}</Text>
                    </View>
                    <Text style={styles.tipAmount}>+{t.amount} €</Text>
                  </View>
                ))
              )}
            </View>
          </View>

          {/* ── QR card ────────────────────────────────────────────── */}
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

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.BG_SCREEN,
  },
  scrollContent: {
    paddingVertical: 28,
    paddingHorizontal: 18,
    alignItems: "center",
  },
  container: {
    width: "100%",
    maxWidth: 520,
  },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  headerText: {
    flex: 1,
    marginRight: 12,
  },
  greeting: {
    color: C.TEXT_SECONDARY,
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 2,
  },
  title: {
    color: C.TEXT_PRIMARY,
    fontSize: 26,
    fontWeight: "800",
  },
  address: {
    color: C.TEXT_TERTIARY,
    marginTop: 4,
    fontSize: 13,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: C.VIOLET_PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    ...SHADOW.violetSm,
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },

  sectionBadge: {
    color: C.TEXT_TERTIARY,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginTop: 20,
    marginBottom: 14,
  },

  // Cards
  cardsStack: {
    gap: 12,
  },
  cardsRow: {
    flexDirection: "row",
    gap: 12,
  },
  card: {
    borderRadius: 20,
    padding: 18,
    ...SHADOW.md,
  },
  cardPrimary: {
    backgroundColor: C.VIOLET_PRIMARY,
  },
  cardSecondary: {
    flex: 1,
    backgroundColor: C.BG_CARD,
    borderWidth: 1,
    borderColor: C.BORDER,
  },
  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  cardLabelPrimary: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  cardBadge: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 8,
    padding: 5,
  },
  cardValuePrimary: {
    color: C.GREEN_POSITIVE,
    fontSize: 34,
    fontWeight: "800",
  },
  cardLabel: {
    color: C.TEXT_TERTIARY,
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  cardValue: {
    color: C.TEXT_PRIMARY,
    fontSize: 24,
    fontWeight: "800",
  },

  // Section
  section: {
    marginTop: 28,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
    gap: 12,
    alignItems: "center",
  },
  sectionTitle: {
    color: C.TEXT_PRIMARY,
    fontSize: 18,
    fontWeight: "800",
  },
  sectionHint: {
    color: C.TEXT_TERTIARY,
    fontSize: 12,
    marginTop: 3,
  },
  sectionLinkBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  sectionLink: {
    color: C.VIOLET_PRIMARY,
    fontSize: 13,
    fontWeight: "700",
  },

  // Tips list
  list: {
    gap: 10,
  },
  tipRow: {
    backgroundColor: C.BG_CARD,
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    ...SHADOW.sm,
    borderWidth: 1,
    borderColor: C.BORDER,
  },
  tipEmpty: {
    flexDirection: "column",
    alignItems: "center",
    paddingVertical: 24,
  },
  tipIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(32,214,155,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  tipInfo: {
    flex: 1,
  },
  tipEmployee: {
    color: C.TEXT_PRIMARY,
    fontSize: 14,
    fontWeight: "700",
  },
  tipTime: {
    color: C.TEXT_TERTIARY,
    fontSize: 12,
    marginTop: 2,
  },
  tipAmount: {
    color: C.GREEN_POSITIVE,
    fontWeight: "800",
    fontSize: 16,
  },
  tipMeta: {
    color: C.TEXT_TERTIARY,
    fontSize: 13,
  },

  // QR card
  qrCard: {
    marginTop: 22,
    borderRadius: 20,
    backgroundColor: C.VIOLET_SUBTLE,
    borderWidth: 1.5,
    borderColor: C.VIOLET_BORDER,
    padding: 18,
    ...SHADOW.sm,
  },
  qrCardContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  qrIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    ...SHADOW.sm,
  },
  qrTextBlock: {
    flex: 1,
  },
  qrTitle: {
    color: C.VIOLET_DARK,
    fontWeight: "800",
    fontSize: 15,
  },
  qrSubtitle: {
    color: C.VIOLET_LIGHT,
    fontSize: 12,
    marginTop: 4,
    lineHeight: 17,
  },
});
