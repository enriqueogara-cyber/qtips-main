import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { onAuthStateChanged, sendPasswordResetEmail, signOut, type User } from "firebase/auth";
import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C, RADIUS, SHADOW } from "../../constants/theme";
import { auth } from "../../lib/firebase";

type OptionItem = {
  label: string;
  hint: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  danger?: boolean;
};

function getInitials(email: string): string {
  return email.slice(0, 2).toUpperCase();
}

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, setUser);
    return unsub;
  }, []);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleLogout = () => {
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
    const email = auth.currentUser?.email;
    if (!email) {
      Alert.alert("Error", "No se encontró el email del usuario");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      Alert.alert(
        "Email enviado",
        `Hemos enviado un enlace a ${email} para restablecer tu contraseña.`
      );
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
        item.danger && styles.optionDanger,
        pressed && { opacity: 0.75, transform: [{ scale: 0.99 }] },
      ]}
      onPress={item.onPress}
    >
      <View style={[styles.optionIcon, item.danger && styles.optionIconDanger]}>
        <Ionicons
          name={item.icon}
          size={18}
          color={item.danger ? C.ERROR : C.VIOLET_PRIMARY}
        />
      </View>
      <View style={styles.optionBody}>
        <Text style={[styles.optionText, item.danger && styles.optionTextDanger]}>
          {item.label}
        </Text>
        {!item.danger && (
          <Text style={styles.optionHint}>{item.hint}</Text>
        )}
      </View>
      {!item.danger && (
        <Ionicons name="chevron-forward" size={16} color={C.TEXT_TERTIARY} />
      )}
    </Pressable>
  );

  const topPad = insets.top > 0 ? insets.top + 8 : 0;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.scrollContent, { paddingTop: topPad + 28 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.container}>

        {/* ── Profile header ──────────────────────────────────────────────── */}
        {user && (
          <View style={styles.profileCard}>
            <View style={styles.profileAvatar}>
              <Text style={styles.profileAvatarText}>
                {getInitials(user.email ?? "QT")}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileEmail} numberOfLines={1}>{user.email}</Text>
              <View style={styles.profileBadge}>
                <View style={styles.profileDot} />
                <Text style={styles.profileBadgeText}>Cuenta activa</Text>
              </View>
            </View>
          </View>
        )}

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
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: C.VIOLET_PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  profileAvatarText: { color: "#FFFFFF", fontSize: 17, fontWeight: "800" },
  profileInfo: { flex: 1, gap: 4 },
  profileEmail: { color: C.TEXT_PRIMARY, fontSize: 14, fontWeight: "700" },
  profileBadge: { flexDirection: "row", alignItems: "center", gap: 5 },
  profileDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.GREEN_POSITIVE },
  profileBadgeText: { color: C.TEXT_TERTIARY, fontSize: 12, fontWeight: "500" },

  // Section label
  sectionLabel: {
    color: C.TEXT_TERTIARY,
    fontSize: 11,
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
  optionDanger: {
    backgroundColor: C.ERROR_SUBTLE,
    borderRadius: RADIUS.lg,
    borderBottomWidth: 0,
    borderWidth: 1,
    borderColor: "#FECDD3",
  },
  optionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: C.VIOLET_SUBTLE,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  optionIconDanger: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  optionBody: { flex: 1 },
  optionText: { color: C.TEXT_PRIMARY, fontSize: 15, fontWeight: "600" },
  optionTextDanger: { color: C.ERROR, fontWeight: "700", fontSize: 15 },
  optionHint: { color: C.TEXT_TERTIARY, fontSize: 12, marginTop: 2 },

  // Logout button (standalone)
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

  footer: {
    color: C.TEXT_TERTIARY,
    textAlign: "center",
    fontSize: 11,
    marginTop: 32,
  },
});
