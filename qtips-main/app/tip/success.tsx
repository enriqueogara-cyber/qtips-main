import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { C, RADIUS, SHADOW } from "../../constants/theme";

export default function TipSuccess() {
  const params = useLocalSearchParams<{ restaurant?: string }>();
  const router = useRouter();

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        {/* Success icon */}
        <View style={styles.iconCircle}>
          <Ionicons name="checkmark" size={44} color="#FFFFFF" />
        </View>

        <Text style={styles.title}>¡Propina enviada!</Text>
        <Text style={styles.subtitle}>
          Muchas gracias por tu generosidad.{"\n"}El equipo lo agradece de corazón.
        </Text>

        {/* Divider */}
        <View style={styles.divider} />

        <View style={styles.infoRow}>
          <Ionicons name="shield-checkmark-outline" size={16} color={C.GREEN_POSITIVE} />
          <Text style={styles.infoText}>Pago procesado de forma segura con Stripe</Text>
        </View>

        {params.restaurant && (
          <Pressable
            style={({ pressed }) => [
              styles.backBtn,
              pressed && { transform: [{ scale: 0.97 }] },
            ]}
            onPress={() => router.replace(`/tip/${params.restaurant}` as any)}
          >
            <Ionicons name="arrow-back" size={16} color={C.VIOLET_PRIMARY} style={{ marginRight: 6 }} />
            <Text style={styles.backText}>Volver al restaurante</Text>
          </Pressable>
        )}
      </View>

      <Text style={styles.poweredBy}>Con QTips · Propinas digitales</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.BG_SCREEN,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: C.BG_CARD,
    borderRadius: RADIUS.xl,
    padding: 32,
    alignItems: "center",
    ...SHADOW.lg,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: C.GREEN_POSITIVE,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    shadowColor: C.GREEN_POSITIVE,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: C.TEXT_PRIMARY,
    textAlign: "center",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    color: C.TEXT_SECONDARY,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  divider: {
    width: "100%",
    height: 1,
    backgroundColor: C.BORDER,
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 24,
  },
  infoText: {
    fontSize: 13,
    color: C.TEXT_TERTIARY,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: RADIUS.md,
    backgroundColor: C.VIOLET_SUBTLE,
    borderWidth: 1.5,
    borderColor: C.VIOLET_BORDER,
  },
  backText: {
    fontSize: 15,
    fontWeight: "700",
    color: C.VIOLET_PRIMARY,
  },
  poweredBy: {
    marginTop: 24,
    fontSize: 12,
    color: C.TEXT_TERTIARY,
    textAlign: "center",
  },
});
