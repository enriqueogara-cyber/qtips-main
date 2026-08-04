import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { doc, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { auth, db } from "../../../lib/firebase";
import { FUNCTIONS_URL } from "../../../lib/functions";
import { C, RADIUS, SHADOW } from "../../../constants/theme";

type StripeStatus =
  | "not_connected"
  | "pending"
  | "action_required"
  | "review"
  | "charges_only"
  | "active"
  | "restricted";

type RestaurantStripeData = {
  stripe_account_id?: string;
  stripe_account_status?: string;
  stripe_charges_enabled?: boolean;
  stripe_payouts_enabled?: boolean;
  stripe_details_submitted?: boolean;
  stripe_onboarding_complete?: boolean;
  stripe_requirements_due?: string[];
  stripe_last_synced_at?: { toDate?: () => Date } | null;
};

async function callConnectLink(token: string): Promise<string> {
  const res = await fetch(`${FUNCTIONS_URL}/createConnectOnboardingLink`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  const data = await res.json() as { url?: string; error?: string };
  if (!res.ok || data.error) throw new Error(data.error ?? "Error generando enlace");
  return data.url as string;
}

async function callSyncAccount(token: string): Promise<void> {
  await fetch(`${FUNCTIONS_URL}/syncStripeAccount`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
}

function deriveStatus(data: RestaurantStripeData): StripeStatus {
  if (!data.stripe_account_id) return "not_connected";
  const s = (data.stripe_account_status ?? "pending") as StripeStatus;
  return s;
}

function formatSyncDate(ts: { toDate?: () => Date } | null | undefined): string {
  if (!ts?.toDate) return "";
  return ts.toDate().toLocaleDateString("es-ES", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

export default function BankScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ connected?: string; refresh?: string }>();

  const [stripeData, setStripeData] = useState<RestaurantStripeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  // Listen to restaurant document for real-time Stripe status
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) { setLoading(false); return; }

    const unsub = onSnapshot(doc(db, "restaurants", user.uid), (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        setStripeData({
          stripe_account_id: d.stripe_account_id,
          stripe_account_status: d.stripe_account_status,
          stripe_charges_enabled: d.stripe_charges_enabled,
          stripe_payouts_enabled: d.stripe_payouts_enabled,
          stripe_details_submitted: d.stripe_details_submitted,
          stripe_onboarding_complete: d.stripe_onboarding_complete,
          stripe_requirements_due: d.stripe_requirements_due,
          stripe_last_synced_at: d.stripe_last_synced_at,
        });
      }
      setLoading(false);
    });

    return unsub;
  }, []);

  // Auto-sync when returning from Stripe onboarding
  useEffect(() => {
    if (params.connected === "1" || params.refresh === "1") {
      auth.currentUser?.getIdToken().then((token) => callSyncAccount(token)).catch(() => null);
    }
  }, [params.connected, params.refresh]);

  const handleConnect = async () => {
    const user = auth.currentUser;
    if (!user) { Alert.alert("Error", "Usuario no autenticado"); return; }

    setConnecting(true);
    try {
      const token = await user.getIdToken();
      const url = await callConnectLink(token);
      await Linking.openURL(url);
    } catch (err: unknown) {
      const e = err as Error;
      Alert.alert("Error", e.message ?? "No se pudo conectar con Stripe");
    } finally {
      setConnecting(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.screen, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={C.VIOLET_PRIMARY} />
      </View>
    );
  }

  const status = deriveStatus(stripeData ?? {});

  return (
    <View style={styles.screen}>
      <View style={styles.container}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backRow}>
          <Ionicons name="chevron-back" size={18} color={C.VIOLET_PRIMARY} />
          <Text style={styles.back}>Volver</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Cuenta de cobros</Text>
        <Text style={styles.subtitle}>Aquí recibirás las propinas de tu restaurante</Text>

        {/* Status card */}
        {status === "not_connected" && <NotConnected onConnect={handleConnect} connecting={connecting} />}
        {(status === "pending" || status === "review") && <PendingUI onContinue={handleConnect} connecting={connecting} />}
        {status === "action_required" && (
          <ActionRequired
            requirements={stripeData?.stripe_requirements_due ?? []}
            onFix={handleConnect}
            connecting={connecting}
          />
        )}
        {status === "restricted" && <Restricted onFix={handleConnect} connecting={connecting} />}
        {(status === "active" || status === "charges_only") && (
          <ActiveAccount
            chargesEnabled={stripeData?.stripe_charges_enabled ?? false}
            payoutsEnabled={stripeData?.stripe_payouts_enabled ?? false}
            lastSynced={stripeData?.stripe_last_synced_at}
            onManage={handleConnect}
          />
        )}

        {/* Sync note */}
        {stripeData?.stripe_last_synced_at && (
          <Text style={styles.syncNote}>
            Última sincronización: {formatSyncDate(stripeData.stripe_last_synced_at)}
          </Text>
        )}
      </View>
    </View>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function NotConnected({ onConnect, connecting }: { onConnect: () => void; connecting: boolean }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardIconBox}>
        <Ionicons name="shield-checkmark-outline" size={32} color={C.VIOLET_PRIMARY} />
      </View>
      <Text style={styles.cardTitle}>Conecta tu cuenta bancaria</Text>
      <Text style={styles.cardText}>
        Stripe verificará de forma segura los datos del titular y la cuenta bancaria. El proceso
        tarda menos de 5 minutos.
      </Text>
      <View style={styles.featureList}>
        {[
          "Pagos con tarjeta, Apple Pay y Google Pay",
          "Transferencias automáticas a tu banco",
          "Panel de control en Stripe",
        ].map((f) => (
          <View key={f} style={styles.featureRow}>
            <Ionicons name="checkmark-circle" size={16} color={C.GREEN_POSITIVE} />
            <Text style={styles.featureText}>{f}</Text>
          </View>
        ))}
      </View>
      <Pressable
        style={({ pressed }) => [
          styles.primaryBtn,
          connecting && styles.btnDisabled,
          pressed && !connecting && { transform: [{ scale: 0.97 }] },
        ]}
        onPress={onConnect}
        disabled={connecting}
      >
        {connecting ? (
          <ActivityIndicator size="small" color="#FFF" />
        ) : (
          <>
            <Ionicons name="link-outline" size={18} color="#FFF" style={{ marginRight: 8 }} />
            <Text style={styles.primaryBtnText}>Conectar cuenta con Stripe</Text>
          </>
        )}
      </Pressable>
      <Text style={styles.secureNote}>
        <Ionicons name="lock-closed-outline" size={11} color={C.TEXT_TERTIARY} /> Stripe verifica los datos — QTIPS no accede a tu información bancaria
      </Text>
    </View>
  );
}

function PendingUI({ onContinue, connecting }: { onContinue: () => void; connecting: boolean }) {
  return (
    <View style={styles.card}>
      <View style={[styles.badge, styles.badgeOrange]}>
        <Ionicons name="time-outline" size={14} color="#92400E" />
        <Text style={[styles.badgeText, { color: "#92400E" }]}>Configuración pendiente</Text>
      </View>
      <Text style={styles.cardTitle}>Completa el registro</Text>
      <Text style={styles.cardText}>
        Necesitas terminar de configurar tu cuenta de Stripe para empezar a recibir propinas.
      </Text>
      <Pressable
        style={({ pressed }) => [
          styles.primaryBtn,
          connecting && styles.btnDisabled,
          pressed && !connecting && { transform: [{ scale: 0.97 }] },
        ]}
        onPress={onContinue}
        disabled={connecting}
      >
        {connecting ? (
          <ActivityIndicator size="small" color="#FFF" />
        ) : (
          <Text style={styles.primaryBtnText}>Continuar configuración</Text>
        )}
      </Pressable>
    </View>
  );
}

function ActionRequired({
  requirements,
  onFix,
  connecting,
}: {
  requirements: string[];
  onFix: () => void;
  connecting: boolean;
}) {
  return (
    <View style={styles.card}>
      <View style={[styles.badge, styles.badgeOrange]}>
        <Ionicons name="alert-circle-outline" size={14} color="#92400E" />
        <Text style={[styles.badgeText, { color: "#92400E" }]}>Se necesita información</Text>
      </View>
      <Text style={styles.cardTitle}>Stripe necesita más datos</Text>
      <Text style={styles.cardText}>
        Completa la información requerida para que tu cuenta quede activa y puedas recibir propinas.
      </Text>
      {requirements.length > 0 && (
        <View style={styles.reqList}>
          {requirements.slice(0, 5).map((r) => (
            <View key={r} style={styles.reqRow}>
              <Ionicons name="ellipse" size={6} color={C.WARNING} />
              <Text style={styles.reqText}>{r}</Text>
            </View>
          ))}
        </View>
      )}
      <Pressable
        style={({ pressed }) => [
          styles.primaryBtn,
          { backgroundColor: C.WARNING },
          connecting && styles.btnDisabled,
          pressed && !connecting && { transform: [{ scale: 0.97 }] },
        ]}
        onPress={onFix}
        disabled={connecting}
      >
        {connecting ? (
          <ActivityIndicator size="small" color="#FFF" />
        ) : (
          <Text style={styles.primaryBtnText}>Completar información</Text>
        )}
      </Pressable>
    </View>
  );
}

function Restricted({ onFix, connecting }: { onFix: () => void; connecting: boolean }) {
  return (
    <View style={styles.card}>
      <View style={[styles.badge, styles.badgeRed]}>
        <Ionicons name="ban-outline" size={14} color={C.ERROR} />
        <Text style={[styles.badgeText, { color: C.ERROR }]}>Cuenta restringida</Text>
      </View>
      <Text style={styles.cardTitle}>Cuenta con restricciones</Text>
      <Text style={styles.cardText}>
        Tu cuenta de Stripe tiene restricciones activas. Accede al panel de Stripe para resolverlas.
      </Text>
      <Pressable
        style={({ pressed }) => [
          styles.primaryBtn,
          { backgroundColor: C.ERROR },
          connecting && styles.btnDisabled,
          pressed && !connecting && { transform: [{ scale: 0.97 }] },
        ]}
        onPress={onFix}
        disabled={connecting}
      >
        {connecting ? (
          <ActivityIndicator size="small" color="#FFF" />
        ) : (
          <Text style={styles.primaryBtnText}>Ver en Stripe</Text>
        )}
      </Pressable>
    </View>
  );
}

function ActiveAccount({
  chargesEnabled,
  payoutsEnabled,
  lastSynced,
  onManage,
}: {
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  lastSynced?: { toDate?: () => Date } | null;
  onManage: () => void;
}) {
  return (
    <View style={styles.card}>
      <View style={[styles.badge, styles.badgeGreen]}>
        <Ionicons name="checkmark-circle" size={14} color={C.GREEN_POSITIVE} />
        <Text style={[styles.badgeText, { color: C.GREEN_POSITIVE }]}>Cuenta conectada</Text>
      </View>
      <Text style={styles.cardTitle}>Tu cuenta está activa</Text>

      <View style={styles.statusList}>
        <StatusRow
          icon="card-outline"
          label="Pagos con tarjeta"
          enabled={chargesEnabled}
        />
        <StatusRow
          icon="arrow-forward-circle-outline"
          label="Transferencias bancarias"
          enabled={payoutsEnabled}
        />
        <StatusRow
          icon="phone-portrait-outline"
          label="Apple Pay / Google Pay"
          enabled={chargesEnabled}
        />
      </View>

      {lastSynced && (
        <Text style={styles.syncDetail}>
          Sincronizado: {formatSyncDate(lastSynced)}
        </Text>
      )}

      <Pressable
        style={({ pressed }) => [
          styles.secondaryBtn,
          pressed && { opacity: 0.75 },
        ]}
        onPress={onManage}
      >
        <Ionicons name="open-outline" size={16} color={C.VIOLET_PRIMARY} style={{ marginRight: 6 }} />
        <Text style={styles.secondaryBtnText}>Gestionar en Stripe</Text>
      </Pressable>
    </View>
  );
}

function StatusRow({ icon, label, enabled }: { icon: keyof typeof Ionicons.glyphMap; label: string; enabled: boolean }) {
  return (
    <View style={styles.statusRow}>
      <View style={[styles.statusIconBox, { backgroundColor: enabled ? C.GREEN_SUBTLE : C.BG_INPUT }]}>
        <Ionicons name={icon} size={16} color={enabled ? C.GREEN_POSITIVE : C.TEXT_TERTIARY} />
      </View>
      <Text style={styles.statusLabel}>{label}</Text>
      <View style={[styles.statusDot, { backgroundColor: enabled ? C.GREEN_POSITIVE : C.TEXT_TERTIARY }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.BG_SCREEN,
    padding: 24,
  },
  container: {
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginBottom: 16,
  },
  back: {
    color: C.VIOLET_PRIMARY,
    fontSize: 15,
    fontWeight: "600",
  },
  title: {
    color: C.TEXT_PRIMARY,
    fontSize: 26,
    fontWeight: "800",
    marginBottom: 6,
  },
  subtitle: {
    color: C.TEXT_SECONDARY,
    marginBottom: 24,
    fontSize: 14,
  },
  syncNote: {
    color: C.TEXT_TERTIARY,
    fontSize: 11,
    textAlign: "center",
    marginTop: 16,
  },

  // Card
  card: {
    backgroundColor: C.BG_CARD,
    borderRadius: RADIUS.lg,
    padding: 22,
    ...SHADOW.md,
    borderWidth: 1,
    borderColor: C.BORDER,
  },
  cardIconBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: C.VIOLET_SUBTLE,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  cardTitle: {
    color: C.TEXT_PRIMARY,
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 8,
  },
  cardText: {
    color: C.TEXT_SECONDARY,
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 20,
  },

  // Badges
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: RADIUS.xs,
    paddingVertical: 6,
    paddingHorizontal: 10,
    alignSelf: "flex-start",
    marginBottom: 14,
  },
  badgeGreen: { backgroundColor: C.GREEN_SUBTLE, borderWidth: 1, borderColor: C.GREEN_BORDER },
  badgeOrange: { backgroundColor: "#FFFBEB", borderWidth: 1, borderColor: "#FDE68A" },
  badgeRed: { backgroundColor: C.ERROR_SUBTLE, borderWidth: 1, borderColor: "#FECDD3" },
  badgeText: { fontSize: 12, fontWeight: "700" },

  // Features list
  featureList: { marginBottom: 20, gap: 10 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  featureText: { color: C.TEXT_SECONDARY, fontSize: 14 },

  // Requirements list
  reqList: { marginBottom: 20, gap: 6 },
  reqRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  reqText: { color: C.TEXT_SECONDARY, fontSize: 13, flex: 1 },

  // Status list
  statusList: { gap: 10, marginBottom: 20 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  statusIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  statusLabel: { flex: 1, fontSize: 14, color: C.TEXT_PRIMARY, fontWeight: "500" },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  syncDetail: { color: C.TEXT_TERTIARY, fontSize: 12, marginBottom: 16 },

  // Buttons
  primaryBtn: {
    backgroundColor: C.VIOLET_PRIMARY,
    paddingVertical: 17,
    borderRadius: RADIUS.md,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    ...SHADOW.violet,
  },
  primaryBtnText: { color: "#FFFFFF", fontWeight: "800", fontSize: 15 },
  btnDisabled: { opacity: 0.55 },
  secondaryBtn: {
    paddingVertical: 14,
    borderRadius: RADIUS.md,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: C.VIOLET_BORDER,
    backgroundColor: C.VIOLET_SUBTLE,
  },
  secondaryBtnText: { color: C.VIOLET_PRIMARY, fontWeight: "700", fontSize: 14 },
  secureNote: {
    color: C.TEXT_TERTIARY,
    fontSize: 11,
    textAlign: "center",
    marginTop: 14,
    lineHeight: 16,
  },
});
