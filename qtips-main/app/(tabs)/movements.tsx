import { Ionicons } from "@expo/vector-icons";
import { onAuthStateChanged, type User } from "firebase/auth";
import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { EmptyState } from "../../components/ui/EmptyState";
import { TipCardSkeleton } from "../../components/ui/Skeleton";
import { C, RADIUS, SHADOW } from "../../constants/theme";
import { DEMO_TIPS, IS_DEMO } from "../../lib/demo-data";
import { auth, db } from "../../lib/firebase";

// ─── Types ────────────────────────────────────────────────────────────────────

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

type StatusFilter = "all" | "paid" | "failed" | "refunded" | "pending";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(ts: { toDate?: () => Date } | null): string {
  if (!ts?.toDate) return "—";
  const d = ts.toDate();
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function statusLabel(s: string): string {
  switch (s) {
    case "paid": return "Pagada";
    case "failed": return "Fallida";
    case "refunded": return "Reembolsada";
    case "partially_refunded": return "Reemb. parcial";
    default: return "Pendiente";
  }
}
function statusColor(s: string): string {
  switch (s) {
    case "paid": return C.GREEN_POSITIVE;
    case "failed": return C.ERROR;
    case "refunded": case "partially_refunded": return C.WARNING;
    default: return C.TEXT_TERTIARY;
  }
}
function statusBg(s: string): string {
  switch (s) {
    case "paid": return C.GREEN_SUBTLE;
    case "failed": return C.ERROR_SUBTLE;
    case "refunded": case "partially_refunded": return "#FFFBEB";
    default: return C.BG_INPUT;
  }
}

function escapeCsv(v: string): string {
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

function downloadCsv(rows: Tip[]) {
  const header = ["Fecha", "Empleado", "Importe (€)", "Comisión (€)", "Neto (€)", "Estado", "Test", "ID"];
  const lines = rows.map((t) => [
    fmt(t.createdAt),
    t.employeeName,
    t.amount.toFixed(2),
    (t.feeCents / 100).toFixed(2),
    ((t.amountCents - t.feeCents) / 100).toFixed(2),
    statusLabel(t.status),
    t.isTest ? "Sí" : "No",
    t.id.slice(0, 8),
  ].map(escapeCsv).join(","));

  const csv = [header.join(","), ...lines].join("\n");

  if (Platform.OS === "web") {
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `qtips-movimientos-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  } else {
    Alert.alert("Exportar movimientos", "La exportación CSV está disponible desde el navegador web.");
  }
}

const STATUS_OPTIONS: { label: string; value: StatusFilter }[] = [
  { label: "Todos", value: "all" },
  { label: "Pagadas", value: "paid" },
  { label: "Pendientes", value: "pending" },
  { label: "Fallidas", value: "failed" },
  { label: "Reembolsadas", value: "refunded" },
];

const PAGE_SIZE = 30;

// ─── Tip row ──────────────────────────────────────────────────────────────────

function TipRow({ tip }: { tip: Tip }) {
  return (
    <View style={styles.row}>
      <View style={[styles.iconBox, { backgroundColor: statusBg(tip.status) }]}>
        <Ionicons
          name={
            tip.status === "paid" ? "checkmark-circle" :
            tip.status === "failed" ? "close-circle" : "refresh-circle"
          }
          size={20}
          color={statusColor(tip.status)}
        />
      </View>
      <View style={styles.rowBody}>
        <View style={styles.rowTop}>
          <Text style={styles.rowEmployee} numberOfLines={1}>{tip.employeeName}</Text>
          <Text style={[styles.rowAmount, tip.status === "paid" && styles.rowAmountPaid]}>
            {tip.status === "paid" ? "+" : ""}{tip.amount.toFixed(2)} €
          </Text>
        </View>
        <View style={styles.rowBottom}>
          <Text style={styles.rowDate}>{fmt(tip.createdAt)}</Text>
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
            Comisión: {(tip.feeCents / 100).toFixed(2)} € · Neto: {((tip.amountCents - tip.feeCents) / 100).toFixed(2)} €
          </Text>
        )}
      </View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function MovementsScreen() {
  const [tips, setTips] = useState<Tip[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [showTests, setShowTests] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    // ── Demo mode ──────────────────────────────────────────────────────────
    if (IS_DEMO) {
      setTips(DEMO_TIPS as unknown as Tip[]);
      setLoading(false);
      return;
    }

    // ── Real Firebase ──────────────────────────────────────────────────────
    const unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (!firebaseUser) { setLoading(false); return; }

      const q = query(
        collection(db, "tips"),
        where("restaurantId", "==", firebaseUser.uid),
        orderBy("createdAt", "desc")
      );

      const unsub = onSnapshot(q, (snap) => {
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
      return unsub;
    });
    return unsubAuth;
  }, []);

  // ── Derived values ──────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let result = tips;
    if (!showTests) result = result.filter((t) => !t.isTest);
    if (statusFilter !== "all") result = result.filter((t) => t.status === statusFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((t) => t.employeeName.toLowerCase().includes(q) || t.id.includes(q));
    }
    return result;
  }, [tips, showTests, statusFilter, search]);

  const paginated = useMemo(() => filtered.slice(0, page * PAGE_SIZE), [filtered, page]);

  const realTotal = useMemo(
    () => tips.filter((t) => t.status === "paid" && !t.isTest).reduce((s, t) => s + t.amount, 0),
    [tips]
  );
  const realCount = tips.filter((t) => t.status === "paid" && !t.isTest).length;

  const handleExport = () => {
    if (IS_DEMO) {
      Alert.alert("Modo demostración", "La exportación no está disponible en modo demo.");
      return;
    }
    if (filtered.length === 0) {
      Alert.alert("Sin datos", "No hay movimientos con los filtros actuales.");
      return;
    }
    downloadCsv(filtered);
  };

  // ── Guard for non-demo (no user) ────────────────────────────────────────────

  if (!IS_DEMO && !user && !loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={C.VIOLET_PRIMARY} />
      </View>
    );
  }

  const topPad = insets.top > 0 ? insets.top + 8 : 20;

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: topPad }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Movimientos</Text>
            <Text style={styles.subtitle}>Historial de propinas recibidas</Text>
          </View>
          <Pressable
            style={({ pressed }) => [styles.exportBtn, pressed && { opacity: 0.7 }]}
            onPress={handleExport}
          >
            <Ionicons name="download-outline" size={16} color={C.VIOLET_PRIMARY} />
            <Text style={styles.exportText}>Exportar</Text>
          </Pressable>
        </View>

        {/* ── Summary card ────────────────────────────────────────────────── */}
        {!loading && realCount > 0 && (
          <View style={styles.summaryCard}>
            <View>
              <Text style={styles.summaryLabel}>TOTAL REAL</Text>
              <Text style={styles.summaryAmount}>{realTotal.toFixed(2)} €</Text>
            </View>
            <View style={styles.summaryBadge}>
              <Ionicons name="receipt-outline" size={14} color={C.GREEN_POSITIVE} />
              <Text style={styles.summaryCount}>{realCount} propina{realCount !== 1 ? "s" : ""}</Text>
            </View>
          </View>
        )}

        {/* ── Search ──────────────────────────────────────────────────────── */}
        <View style={styles.searchWrapper}>
          <Ionicons name="search-outline" size={16} color={C.TEXT_TERTIARY} style={{ marginLeft: 12 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar empleado o ID..."
            placeholderTextColor={C.TEXT_TERTIARY}
            value={search}
            onChangeText={(v) => { setSearch(v); setPage(1); }}
            clearButtonMode="while-editing"
          />
        </View>

        {/* ── Status filter chips ──────────────────────────────────────────── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipsScroll}
          contentContainerStyle={styles.chips}
        >
          {STATUS_OPTIONS.map((opt) => (
            <Pressable
              key={opt.value}
              style={[styles.chip, statusFilter === opt.value && styles.chipActive]}
              onPress={() => { setStatusFilter(opt.value); setPage(1); }}
            >
              <Text style={[styles.chipText, statusFilter === opt.value && styles.chipTextActive]}>
                {opt.label}
              </Text>
            </Pressable>
          ))}
          <Pressable
            style={[styles.chip, showTests && styles.chipActive]}
            onPress={() => { setShowTests((v) => !v); setPage(1); }}
          >
            <Text style={[styles.chipText, showTests && styles.chipTextActive]}>Tests</Text>
          </Pressable>
        </ScrollView>

        {/* ── Count ───────────────────────────────────────────────────────── */}
        {!loading && (
          <Text style={styles.resultCount}>
            {filtered.length} resultado{filtered.length !== 1 ? "s" : ""}
            {filtered.length !== tips.length ? ` de ${tips.length}` : ""}
          </Text>
        )}

        {/* ── List ────────────────────────────────────────────────────────── */}
        {loading ? (
          <View style={styles.list}>
            {[1, 2, 3, 4, 5].map((k) => <TipCardSkeleton key={k} />)}
          </View>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="receipt-outline"
            title={tips.length === 0 ? "Sin movimientos aún" : "Sin resultados"}
            description={
              tips.length === 0
                ? "Las propinas aparecerán aquí cuando alguien escanee tu QR y pague."
                : "Prueba con otros filtros o términos de búsqueda."
            }
          />
        ) : (
          <>
            <View style={styles.list}>
              {paginated.map((tip) => <TipRow key={tip.id} tip={tip} />)}
            </View>
            {paginated.length < filtered.length && (
              <Pressable
                style={({ pressed }) => [styles.loadMoreBtn, pressed && { opacity: 0.7 }]}
                onPress={() => setPage((p) => p + 1)}
              >
                <Text style={styles.loadMoreText}>
                  Cargar más ({filtered.length - paginated.length} restantes)
                </Text>
              </Pressable>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.BG_SCREEN },
  scrollContent: { padding: 20, paddingBottom: 48, maxWidth: 620, width: "100%", alignSelf: "center" },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  title: { fontSize: 28, fontWeight: "800", color: C.TEXT_PRIMARY },
  subtitle: { fontSize: 14, color: C.TEXT_SECONDARY, marginTop: 4 },
  exportBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: C.VIOLET_SUBTLE,
    borderRadius: RADIUS.sm,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: C.VIOLET_BORDER,
    marginTop: 4,
  },
  exportText: { color: C.VIOLET_PRIMARY, fontSize: 13, fontWeight: "700" },

  summaryCard: {
    backgroundColor: C.VIOLET_PRIMARY,
    borderRadius: RADIUS.lg,
    padding: 20,
    marginBottom: 16,
    ...SHADOW.violet,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryLabel: { color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: "700", letterSpacing: 1, marginBottom: 4 },
  summaryAmount: { color: "#FFFFFF", fontSize: 30, fontWeight: "800" },
  summaryBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: RADIUS.sm,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  summaryCount: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },

  searchWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.BG_CARD,
    borderRadius: RADIUS.sm,
    borderWidth: 1.5,
    borderColor: C.BORDER_INPUT,
    marginBottom: 12,
    ...SHADOW.sm,
  },
  searchInput: { flex: 1, color: C.TEXT_PRIMARY, padding: 12, fontSize: 15 },

  chipsScroll: { marginBottom: 8 },
  chips: { gap: 8, paddingBottom: 4 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
    backgroundColor: C.BG_CARD,
    borderWidth: 1,
    borderColor: C.BORDER,
  },
  chipActive: { backgroundColor: C.VIOLET_PRIMARY, borderColor: C.VIOLET_PRIMARY },
  chipText: { color: C.TEXT_SECONDARY, fontSize: 13, fontWeight: "600" },
  chipTextActive: { color: "#FFFFFF" },

  resultCount: { color: C.TEXT_TERTIARY, fontSize: 12, marginBottom: 12, marginTop: 4 },

  list: { gap: 10 },
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
  iconBox: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  rowBody: { flex: 1, gap: 4 },
  rowTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  rowEmployee: { flex: 1, fontSize: 15, fontWeight: "700", color: C.TEXT_PRIMARY, marginRight: 8 },
  rowAmount: { fontSize: 15, fontWeight: "800", color: C.TEXT_PRIMARY },
  rowAmountPaid: { color: C.GREEN_POSITIVE },
  rowBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 4 },
  rowDate: { fontSize: 12, color: C.TEXT_TERTIARY },
  rowBadges: { flexDirection: "row", gap: 6 },
  testBadge: { backgroundColor: "#FEF9C3", borderRadius: RADIUS.xs, paddingHorizontal: 6, paddingVertical: 2 },
  testBadgeText: { fontSize: 10, fontWeight: "800", color: "#92400E", letterSpacing: 0.5 },
  statusBadge: { borderRadius: RADIUS.xs, paddingHorizontal: 8, paddingVertical: 2 },
  statusText: { fontSize: 11, fontWeight: "700" },
  feeText: { fontSize: 11, color: C.TEXT_TERTIARY, marginTop: 2 },

  loadMoreBtn: {
    marginTop: 16,
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: C.BORDER,
    backgroundColor: C.BG_CARD,
  },
  loadMoreText: { color: C.VIOLET_PRIMARY, fontSize: 14, fontWeight: "700" },

  center: { flex: 1, alignItems: "center", justifyContent: "center" },
});
