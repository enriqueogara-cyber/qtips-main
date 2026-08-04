import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { sendPasswordResetEmail, signOut } from "firebase/auth";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { auth } from "../../lib/firebase";
import { C, SHADOW, RADIUS } from "../../constants/theme";

type OptionItem = {
  label: string;
  hint: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  danger?: boolean;
};

export default function SettingsScreen() {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.replace("/login");
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
      Alert.alert("Error", "No se pudo cerrar sesión");
    }
  };

  const handleChangePassword = async () => {
    const user = auth.currentUser;

    if (!user?.email) {
      Alert.alert("Error", "No se encontró el email del usuario");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, user.email);
      Alert.alert(
        "Email enviado",
        `Hemos enviado un enlace a ${user.email} para restablecer tu contraseña.`
      );
    } catch (error) {
      console.error("Error al enviar email:", error);
      Alert.alert("Error", "No se pudo enviar el email. Inténtalo de nuevo.");
    }
  };

  const restaurantOptions: OptionItem[] = [
    {
      label: "Editar información",
      hint: "Nombre, dirección, logo",
      icon: "storefront-outline",
      onPress: () => router.push("/setup-restaurant"),
    },
    {
      label: "Empleados",
      hint: "Añadir o eliminar empleados",
      icon: "people-outline",
      onPress: () => router.push("/settings/employees"),
    },
  ];

  const paymentOptions: OptionItem[] = [
    {
      label: "Cuenta bancaria",
      hint: "Dónde recibir las propinas",
      icon: "card-outline",
      onPress: () => router.push("/settings/bank"),
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

  const renderOption = (item: OptionItem) => (
    <Pressable
      key={item.label}
      style={({ pressed }) => [
        styles.option,
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

  return (
    <View style={styles.screen}>
      <View style={styles.container}>
        <Text style={styles.title}>Ajustes</Text>
        <Text style={styles.subtitle}>
          Configura tu restaurante y gestiona tu cuenta
        </Text>

        <Text style={styles.sectionLabel}>RESTAURANTE</Text>
        <View style={styles.group}>
          {restaurantOptions.map(renderOption)}
        </View>

        <Text style={styles.sectionLabel}>PAGOS</Text>
        <View style={styles.group}>
          {paymentOptions.map(renderOption)}
        </View>

        <Text style={styles.sectionLabel}>CUENTA</Text>
        <View style={styles.group}>
          {accountOptions.map(renderOption)}
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.option,
            styles.optionDanger,
            pressed && { opacity: 0.75 },
            { marginTop: 12 },
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

        <Text style={styles.footer}>QTips · Versión MVP</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.BG_SCREEN,
    justifyContent: "center",
  },
  container: {
    padding: 24,
    maxWidth: 520,
    width: "100%",
    alignSelf: "center",
  },
  title: {
    color: C.TEXT_PRIMARY,
    fontSize: 28,
    fontWeight: "800",
  },
  subtitle: {
    color: C.TEXT_SECONDARY,
    marginTop: 6,
    marginBottom: 28,
    fontSize: 14,
  },
  sectionLabel: {
    color: C.TEXT_TERTIARY,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 10,
    marginTop: 24,
  },
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
    paddingVertical: 16,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.BORDER,
  },
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
  },
  optionIconDanger: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
  },
  optionBody: {
    flex: 1,
  },
  optionText: {
    color: C.TEXT_PRIMARY,
    fontSize: 15,
    fontWeight: "600",
  },
  optionTextDanger: {
    color: C.ERROR,
    fontWeight: "700",
    fontSize: 15,
  },
  optionHint: {
    color: C.TEXT_TERTIARY,
    fontSize: 12,
    marginTop: 2,
  },
  footer: {
    color: C.TEXT_TERTIARY,
    textAlign: "center",
    fontSize: 11,
    marginTop: 32,
  },
});
