import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { onAuthStateChanged, sendPasswordResetEmail, signOut, type User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C, RADIUS, SHADOW } from "../../constants/theme";
import { DEMO_RESTAURANT, IS_DEMO } from "../../lib/demo-data";
import { auth, db } from "../../lib/firebase";

// ─── Types ────────────────────────────────────────────────────────────────────

type OptionItem = {
  label: string;
  hint: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  danger?: boolean;
};

type StripeStatus =
  | "not_connected"
  | "pending"
  | "action_required"
  | "active"
  | "charges_only"
  | "restricted";

type StripeFields = {
  stripe_account_id?: string;
  stripe_onboarding_complete?: boolean;
  stripe_charges_enabled?: boolean;
  stripe_payouts_enabled?: boolean;
  stripe_account_status?: string;
  stripe_requirements_due?: string[];
};

// ─── Stripe status card ───────────────────────────────────────────────────────

function deriveStripeStatus(data: StripeFields): StripeStatus {
  if (!data.stripe_account_id) return "not_connected";
  if (!data.stripe_onboarding_complete) return "pending";
  if (data.stripe_requirements_due && data.stripe_requirements_due.length > 0) return "action_required";
  if (data.stripe_charges_enabled && data.stripe_payouts_enabled) return "active";
  if (data.stripe_charges_enabled && !data.stripe_payouts_enabled) return "charges_only";
  return "restricted";
}

function StripeStatusCard({
  data,
  onPress,
}: {
  data: StripeFields | null;
  onPress: () => void;
}) {
  if (!data) return null;

  const status = deriveStripeStatus(data);

  type StatusCfg = {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    description: string;
    bg: string;
    border: string;
    iconBg: string;
    iconColor: string;
    textColor: string;
  };

  const cfg: Record<StripeStatus, StatusCfg> = {
    not_connected: {
      icon: "card-outline",
      label: "Sin conectar",
      description: "Conecta tu cuenta de Stripe para empezar a cobrar propinas.",
      bg: C.BG_CARD,
      border: C.BORDER,
      iconBg: C.BG_INPUT,
      iconColor: C.TEXT_TERTIARY,
      textColor: C.TEXT_SECONDARY,
    },
    pending: {
      icon: "hourglass-outline",
      label: "Configuración pendiente",
      description: "Completa la verificación de tu cuenta en Stripe.",
      bg: "#FFFBEB",
      border: "#FDE68A",
      iconBg: "#FEF3C7",
      iconColor: C.WARNING,
      textColor: "#92400E",
    },
    action_required: {
      icon: "warning-outline",
      label: "Acción requerida",
      description: "Stripe necesita información adicional para activar tu cuenta.",
      bg: C.ERROR_SUBTLE,
      border: "#FECDD3",
      iconBg: "#FEE2E2",
      iconColor: C.ERROR,
      textColor: C.ERROR,
    },
    active: {
      icon: "checkmark-circle",
      label: "Cuenta activa",
      description: "Tu cuenta está conectada y lista para recibir propinas.",
      bg: C.GREEN_SUBTLE,
      border: C.GREEN_BORDER,
      iconBg: "rgba(22,166,106,0.12)",
      iconColor: C.GREEN_POSITIVE,
      textColor: "#065F46",
    },
    charges_only: {
      icon: "alert-circle-outline",
      label: "Pagos activados",
      description: "Recibes propinas, pero los pagos a tu banco están pausados.",
      bg: "#FFFBEB",
      border: "#FDE68A",
      iconBg: "#FEF3C7",
      iconColor: C.WARNING,
      textColor: "#92400E",
    },
    restricted: {
      icon: "ban-outline",
      label: "Cuenta restringida",
      description: "Hay un problema con tu cuenta. Revisa los detalles en Stripe.",
      bg: C.ERROR_SUBTLE,
      border: "#FECDD3",
      iconBg: "#FEE2E2",
      iconColor: C.ERROR,
      textColor: C.ERROR,
    },
  };

  const s = cfg[status];

  return (
    <Pressable
      style={({ pressed }) => [
        stripeCard.card,
        { backgroundColor: s.bg, borderColor: s.border },
        pressed && { opacity: 0.85 },
      ]}
      onPress={onPress}
    >
      <View style={[stripeCard.iconBox, { backgroundColor: s.iconBg }]}>
        <Ionicons name={s.icon} size={20} color={s.iconColor} />
      </View>
      <View style={stripeCard.body}>
        <Text style={[stripeCard.label, { color: s.textColor }]}>{s.label}</Text>
        <Text style={[stripeCard.desc, { color: s.textColor, opacity: 0.8 }]}>{s.description}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={s.textColor} style={{ opacity: 0.5 }} />
    </Pressable>
  );
}

const stripeCard = StyleSheet.create({
  card: {
    borderRadius: RADIUS.md,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1.5,
    marginBottom: 4,
    ...SHADOW.sm,
  },
  iconBox: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  body: { flex: 1 },
  label: { fontSize: 14, fontWeight: "800", marginBottom: 2 },
  desc: { fontSize: 12, lineHeight: 17 },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(email: string): string {
  return email.slice(0, 2).toUpperCase();
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [user, setUser] = useState<User | null>(null);
  const [stripeData, setStripeData] = useState<StripeFields | null>(null);

  useEffect(() => {
    if (IS_DEMO) {
      setStripeData(DEMO_RESTAURANT as StripeFields);
      return;
    }
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const snap = await getDoc(doc(db, "restaurants", firebaseUser.uid));
          if (snap.exists()) {
            const d = snap.data();
            setStripeData({
              stripe_account_id: d.stripe_account_id,
              stripe_onboarding_complete: d.stripe_onboarding_complete,
              stripe_charges_enabled: d.stripe_charges_enabled,
              stripe_payouts_enabled: d.stripe_payouts_enabled,
              stripe_account_status: d.stripe_account_status,
              stripe_requirements_due: d.stripe_requirements_due,
            });
          }
        } catch {
          // ignore
        }
      }
    });
    return unsub;
  }, []);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleLogout = () => {
    if (IS_DEMO) {
      Alert.alert("Modo demostración", "No puedes cerrar sesión en modo demo.");
      return;
    }
    Alert.alert(
      "Cerrar sesión",
      "¿Seguro que quieres salir de tu cuenta?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Cerrar sesión",
          style: "destructive",
          onPress: async () => {
            try {
              await signOut(auth);
              router.replace("/login");
            } catch {
              Alert.alert("Error", "No se pudo cerrar sesión");
            }
          },
        },
      ]
    );
  };

  const handleChangePassword = async () => {
    if (IS_DEMO) {
      Alert.alert("Modo demostración", "Esta acción no está disponible en modo demo.");
      return;
    }
    const email = auth.currentUser?.email;
    if (!email) {
      Alert.alert("Error", "No se encontró el email del usuario");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      Alert.alert("Email enviado", `Hemos enviado un enlace a ${email} para restablecer tu contraseña.`);
    } catch {
      Alert.alert("Error", "No se pudo enviar el email. Inténtalo de nuevo.");
    }
  };

  // ── Option groups ──────────────────────────────────────────────────────────

  const restaurantOptions: OptionItem[] = [
    {
      label: "Editar información",
      hint: "Nombre, dirección, logo",
      icon: "storefront-outline",
      onPress: () => router.push("/setup-restaurant"),
    },
    {
      label: "Empleados",
      hint: "Añadir o desactivar empleados",
      icon: "people-outline",
      onPress: () => router.push("/settings/employees"),
    },
  ];

  const paymentOptions: OptionItem[] = [
    {
      label: "Cuenta de cobros",
      hint: "Conecta con Stripe para recibir propinas",
      icon: "card-outline",
      onPress: () => router.push("/settings/bank"),
    },
    {
      label: "Configuración de propinas",
      hint: "Cómo se atribuyen las propinas",
      icon: "options-outline",
      onPress: () => router.push("/settings/tip-config"),
    },
  ];

  const accountOptions: OptionItem[] = [
    {
      label: "Cambiar contraseña",
      hint: "Te enviaremos un email con el enlace",
      icon: "lock-closed-outline",
      onPress: handleChangePassword,
    },
  ];

  // ── Render option ──────────────────────────────────────────────────────────

  const renderOption = (item: OptionItem, isLast: boolean) => (
    <Pressable
      key={item.label}
      style={({ pressed }) => [
        styles.option,
        isLast && styles.optionLast,
        pressed && { opacity: 0.75, transform: [{ scale: 0.99 }] },
      ]}
      onPress={item.onPress}
    >
      <View style={styles.optionIcon}>
        <Ionicons name={item.icon} size={18} color={C.VIOLET_PRIMARY} />
      </View>
      <View style={styles.optionBody}>
        <Text style={styles.optionText}>{item.label}</Text>
        <Text style={styles.optionHint}>{item.hint}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={C.TEXT_TERTIARY} />
    </Pressable>
  );

  const topPad = insets.top > 0 ? insets.top + 8 : 0;
  const displayEmail = IS_DEMO ? "demo@qtips.app" : (user?.email ?? "");

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.scrollContent, { paddingTop: topPad + 28 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.container}>

        {/* ── Profile header ──────────────────────────────────────────────── */}
        {(user || IS_DEMO) && (
          <View style={styles.profileCard}>
            <View style={styles.profileAvatar}>
              <Text style={styles.profileAvatarText}>
                {IS_DEMO ? "DM" : getInitials(user?.email ?? "QT")}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileEmail} numberOfLines={1}>{displayEmail}</Text>
              <View style={styles.profileBadge}>
                <View style={[styles.profileDot, IS_DEMO && { backgroundColor: C.WARNING }]} />
                <Text style={styles.profileBadgeText}>
                  {IS_DEMO ? "Modo demostración" : "Cuenta activa"}
                </Text>
              </View>
            </View>
            {IS_DEMO && (
              <View style={styles.demoBadge}>
                <Text style={styles.demoBadgeText}>DEMO</Text>
              </View>
            )}
          </View>
        )}

        {/* ── Stripe status card ──────────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>ESTADO DE PAGOS</Text>
        <StripeStatusCard
          data={stripeData}
          onPress={() => router.push("/settings/bank")}
        />

        {/* ── Restaurante ─────────────────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>RESTAURANTE</Text>
        <View style={styles.group}>
          {restaurantOptions.map((item, i) =>
            renderOption(item, i === restaurantOptions.length - 1)
          )}
        </View>

        {/* ── Pagos ───────────────────────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>PAGOS</Text>
        <View style={styles.group}>
          {paymentOptions.map((item, i) =>
            renderOption(item, i === paymentOptions.length - 1)
          )}
        </View>

        {/* ── Cuenta ──────────────────────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>CUENTA</Text>
        <View style={styles.group}>
          {accountOptions.map((item, i) =>
            renderOption(item, i === accountOptions.length - 1)
          )}
        </View>

        {/* ── Logout ──────────────────────────────────────────────────────── */}
        <Pressable
          style={({ pressed }) => [
            styles.logoutBtn,
            pressed && { opacity: 0.75, transform: [{ scale: 0.99 }] },
          ]}
          onPress={handleLogout}
        >
          <View style={styles.optionIconDanger}>
            <Ionicons name="log-out-outline" size={18} color={C.ERROR} />
          </View>
          <View style={styles.optionBody}>
            <Text style={styles.optionTextDanger}>Cerrar sesión</Text>
          </View>
        </Pressable>

        <Text style={styles.footer}>QTips · v1.0 MVP</Text>
      </View>
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.BG_SCREEN },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 48, alignItems: "center" },
  container: { maxWidth: 520, width: "100%" },

  // Profile
  profileCard: {
    backgroundColor: C.BG_CARD,
    borderRadius: RADIUS.lg,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 24,
    ...SHADOW.sm,
    borderWidth: 1,
    borderColor: C.BORDER,
  },
  profileAvatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: C.VIOLET_PRIMARY,
    alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  profileAvatarText: { color: "#FFFFFF", fontSize: 17, fontWeight: "800" },
  profileInfo: { flex: 1, gap: 4 },
  profileEmail: { color: C.TEXT_PRIMARY, fontSize: 14, fontWeight: "700" },
  profileBadge: { flexDirection: "row", alignItems: "center", gap: 5 },
  profileDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.GREEN_POSITIVE },
  profileBadgeText: { color: C.TEXT_TERTIARY, fontSize: 12, fontWeight: "500" },
  demoBadge: {
    backgroundColor: "#FEF9C3",
    borderRadius: RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  demoBadgeText: { color: "#92400E", fontSize: 10, fontWeight: "800" },

  // Section label
  sectionLabel: {
    color: C.TEXT_TERTIARY,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 10,
    marginTop: 24,
    marginLeft: 4,
  },

  // Option group
  group: {
    borderRadius: RADIUS.lg,
    overflow: "hidden",
    backgroundColor: C.BG_CARD,
    ...SHADOW.sm,
    borderWidth: 1,
    borderColor: C.BORDER,
  },
  option: {
    backgroundColor: C.BG_CARD,
    paddingVertical: 15,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.BORDER,
  },
  optionLast: { borderBottomWidth: 0 },
  optionIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: C.VIOLET_SUBTLE,
    alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  optionIconDanger: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: "#FEE2E2",
    alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  optionBody: { flex: 1 },
  optionText: { color: C.TEXT_PRIMARY, fontSize: 15, fontWeight: "600" },
  optionTextDanger: { color: C.ERROR, fontWeight: "700", fontSize: 15 },
  optionHint: { color: C.TEXT_TERTIARY, fontSize: 12, marginTop: 2 },

  // Logout button
  logoutBtn: {
    marginTop: 16,
    backgroundColor: C.ERROR_SUBTLE,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: "#FECDD3",
    paddingVertical: 15,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  footer: { color: C.TEXT_TERTIARY, textAlign: "center", fontSize: 11, marginTop: 32 },
});
