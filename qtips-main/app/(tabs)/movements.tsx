import { Ionicons } from "@expo/vector-icons";
import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { onAuthStateChanged, type User } from "firebase/auth";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { auth, db } from "../../lib/firebase";
import { C, RADIUS, SHADOW } from "../../constants/theme";

type Tip = {
  id: string;
  restaurantId: string;
  employeeName: string;
  employeeId: string | null;
  amount: number;
  amountCents: number;
  feeCents: number;
  currency: string;
  status: string;
  isTest: boolean;
  createdAt: { toDate?: () => Date } | null;
  paidAt: { toDate?: () => Date } | null;
};

function formatDate(ts: { toDate?: () => Date } | null): string {
  if (!ts?.toDate) return "—";
  const d = ts.toDate();
  return d.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusLabel(status: string): string {
  switch (status) {
    case "paid": return "Pagada";
    case "failed": return "Fallida";
    case "refunded": return "Reembolsada";
    case "partially_refunded": return "Reembolso parcial";
    default: return "Pendiente";
  }
}

function statusColor(status: string): string {
  switch (status) {
    case "paid": return C.GREEN_POSITIVE;
    case "failed": return C.ERROR;
    case "refunded":
    case "partially_refunded": return C.WARNING;
    default: return C.TEXT_TERTIARY;
  }
}

function statusBg(status: string): string {
  switch (status) {
    case "paid": return C.GREEN_SUBTLE;
    case "failed": return C.ERROR_SUBTLE;
    case "refunded":
    case "partially_refunded": return "#FFFBEB";
    default: return C.BG_INPUT;
  }
}

export default function MovementsScreen() {
  const [tips, setTips] = useState<Tip[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (!firebaseUser) {
        setLoading(false);
        return;
      }

      const q = query(
        collection(db, "tips"),
        where("restaurantId", "==", firebaseUser.uid),
        orderBy("createdAt", "desc")
      );

      const unsubSnap = onSnapshot(q, (snap) => {
        setTips(
          snap.docs.map((d) => ({
            id: d.id,
            restaurantId: d.data().restaurantId ?? "",
            employeeName: d.data().employeeName ?? "Propina general",
            employeeId: d.data().employeeId ?? null,
            amount: d.data().amount ?? 0,
            amountCents: d.data().amountCents ?? 0,
            feeCents: d.data().feeCents ?? 0,
            currency: d.data().currency ?? "eur",
            status: d.data().status ?? "paid",
            isTest: d.data().isTest ?? false,
            createdAt: d.data().createdAt ?? null,
            paidAt: d.data().paidAt ?? null,
          }))
        );
        setLoading(false);
      });

      return unsubSnap;
    });

    return unsubAuth;
  }, []);

  const total = tips.filter((t) => t.status === "paid" && !t.isTest)
    .reduce((sum, t) => sum + t.amount, 0);
  const count = tips.filter((t) => t.status === "paid" && !t.isTest).length;

  if (!user) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={C.VIOLET_PRIMARY} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Movimientos</Text>
          <Text style={styles.subtitle}>Historial de propinas recibidas</Text>
        </View>

        {/* Summary card */}
        {!loading && tips.length > 0 && (
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <View>
                <Text style={styles.summaryLabel}>TOTAL REAL</Text>
                <Text style={styles.summaryAmount}>{total.toFixed(2)} €</Text>
              </View>
              <View style={styles.summaryBadge}>
                <Ionicons name="receipt-outline" size={14} color={C.GREEN_POSITIVE} />
                <Text style={styles.summaryCount}>
                  {count} propina{count !== 1 ? "s" : ""}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* List */}
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={C.VIOLET_PRIMARY} />
            <Text style={styles.loadingText}>Cargando movimientos...</Text>
          </View>
        ) : tips.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="receipt-outline" size={44} color={C.BORDER} />
            <Text style={styles.emptyTitle}>Sin movimientos aún</Text>
            <Text style={styles.emptyText}>
              Las propinas recibidas aparecerán aquí una vez que alguien escanee tu QR y pague.
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {tips.map((tip) => (
              <View key={tip.id} style={styles.row}>
                {/* Left: icon */}
                <View style={[styles.iconBox, { backgroundColor: statusBg(tip.status) }]}>
                  <Ionicons
                    name={
                      tip.status === "paid"
                        ? "checkmark-circle"
                        : tip.status === "failed"
                        ? "close-circle"
                        : "refresh-circle"
                    }
                    size={20}
                    color={statusColor(tip.status)}
                  />
                </View>

                {/* Center: info */}
                <View style={styles.rowBody}>
                  <View style={styles.rowTop}>
                    <Text style={styles.rowEmployee} numberOfLines={1}>
                      {tip.employeeName}
                    </Text>
                    <Text style={styles.rowAmount}>
                      {tip.amount.toFixed(2)} €
                    </Text>
                  </View>
                  <View style={styles.rowBottom}>
                    <Text style={styles.rowDate}>{formatDate(tip.createdAt)}</Text>
                    <View style={styles.rowBadges}>
                      {tip.isTest && (
                        <View style={styles.testBadge}>
                          <Text style={styles.testBadgeText}>TEST</Text>
                        </View>
                      )}
                      <View style={[styles.statusBadge, { backgroundColor: statusBg(tip.status) }]}>
                        <Text style={[styles.statusText, { color: statusColor(tip.status) }]}>
                          {statusLabel(tip.status)}
                        </Text>
                      </View>
                    </View>
                  </View>
                  {tip.feeCents > 0 && tip.status === "paid" && (
                    <Text style={styles.feeText}>
                      Comisión QTIPS: {(tip.feeCents / 100).toFixed(2)} € •{" "}
                      Neto: {((tip.amountCents - tip.feeCents) / 100).toFixed(2)} €
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
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
    padding: 20,
    paddingBottom: 40,
    maxWidth: 600,
    width: "100%",
    alignSelf: "center",
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: C.TEXT_PRIMARY,
  },
  subtitle: {
    fontSize: 14,
    color: C.TEXT_SECONDARY,
    marginTop: 4,
  },

  // Summary
  summaryCard: {
    backgroundColor: C.VIOLET_PRIMARY,
    borderRadius: RADIUS.lg,
    padding: 20,
    marginBottom: 20,
    ...SHADOW.violet,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryLabel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 4,
  },
  summaryAmount: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "800",
  },
  summaryBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: RADIUS.sm,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  summaryCount: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },

  // List
  list: {
    gap: 10,
  },
  row: {
    backgroundColor: C.BG_CARD,
    borderRadius: RADIUS.md,
    padding: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    ...SHADOW.sm,
    borderWidth: 1,
    borderColor: C.BORDER,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  rowBody: {
    flex: 1,
    gap: 4,
  },
  rowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rowEmployee: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: C.TEXT_PRIMARY,
    marginRight: 8,
  },
  rowAmount: {
    fontSize: 15,
    fontWeight: "800",
    color: C.TEXT_PRIMARY,
  },
  rowBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 4,
  },
  rowDate: {
    fontSize: 12,
    color: C.TEXT_TERTIARY,
  },
  rowBadges: {
    flexDirection: "row",
    gap: 6,
  },
  testBadge: {
    backgroundColor: "#FEF9C3",
    borderRadius: RADIUS.xs,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  testBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#92400E",
    letterSpacing: 0.5,
  },
  statusBadge: {
    borderRadius: RADIUS.xs,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
  },
  feeText: {
    fontSize: 11,
    color: C.TEXT_TERTIARY,
    marginTop: 2,
  },

  // States
  center: {
    paddingVertical: 60,
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    color: C.TEXT_TERTIARY,
    fontSize: 13,
  },
  emptyBox: {
    marginTop: 20,
    backgroundColor: C.BG_CARD,
    borderRadius: RADIUS.lg,
    padding: 32,
    alignItems: "center",
    gap: 10,
    ...SHADOW.sm,
    borderWidth: 1,
    borderColor: C.BORDER,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: C.TEXT_PRIMARY,
    marginTop: 8,
  },
  emptyText: {
    fontSize: 13,
    color: C.TEXT_SECONDARY,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 280,
  },
});
