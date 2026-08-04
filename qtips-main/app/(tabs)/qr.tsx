import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { onAuthStateChanged, type User } from "firebase/auth";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import { auth } from "../../lib/firebase";
import { C, SHADOW, RADIUS } from "../../constants/theme";

export default function QRScreen() {
  const router = useRouter();
  const svgRef = useRef<any>(null);

  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoadingUser(false);
    });

    return unsubscribe;
  }, []);

  const restaurantId = user?.uid ?? "";
  const qrValue = `https://pay.qtips.me/tip/${restaurantId}`;

  const handleShare = async () => {
    if (!restaurantId) {
      Alert.alert("Error", "No hay restaurante autenticado");
      return;
    }

    try {
      await Share.share({
        message: `Deja propina con QTips: ${qrValue}`,
        url: qrValue,
      });
    } catch {
      Alert.alert("Error", "No se pudo compartir el QR");
    }
  };

  const handleDownload = () => {
    Alert.alert(
      "Descargar QR",
      "Mantén pulsado el QR para guardarlo, o usa Compartir para enviarlo a tus dispositivos."
    );
  };

  const handlePrint = () => {
    Alert.alert(
      "Imprimir",
      "Comparte el QR con tu email o servicio de impresión desde el botón Compartir."
    );
  };

  if (loadingUser) {
    return (
      <View style={[styles.screen, { justifyContent: "center" }]}>
        <ActivityIndicator size="large" color={C.VIOLET_PRIMARY} />
        <Text style={styles.subtitle}>Cargando sesión...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.screen}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Ionicons name="chevron-back" size={18} color={C.VIOLET_PRIMARY} />
          <Text style={styles.backText}>Volver</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Código QR</Text>
        <Text style={styles.subtitle}>No hay un usuario autenticado ahora mismo</Text>

        <Pressable
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && { transform: [{ scale: 0.97 }] },
          ]}
          onPress={() => router.replace("/login")}
        >
          <Text style={styles.primaryButtonText}>Ir al login</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <TouchableOpacity onPress={() => router.back()} style={styles.back}>
        <Ionicons name="chevron-back" size={18} color={C.VIOLET_PRIMARY} />
        <Text style={styles.backText}>Volver</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Código QR del restaurante</Text>
      <Text style={styles.subtitle}>
        Los clientes escanean este QR y dejan propina desde su móvil
      </Text>

      {/* QR container */}
      <View style={styles.qrWrapper}>
        <View style={styles.qrBox}>
          <QRCode
            value={qrValue}
            size={170}
            getRef={(ref) => { svgRef.current = ref; }}
          />
        </View>
        {/* Corner decorations */}
        <View style={[styles.corner, styles.cornerTL]} />
        <View style={[styles.corner, styles.cornerTR]} />
        <View style={[styles.corner, styles.cornerBL]} />
        <View style={[styles.corner, styles.cornerBR]} />
      </View>

      <Text style={styles.urlText}>{qrValue}</Text>

      {/* Primary button */}
      <Pressable
        style={({ pressed }) => [
          styles.primaryButton,
          pressed && { transform: [{ scale: 0.97 }] },
        ]}
        onPress={handleShare}
      >
        <Ionicons name="share-social-outline" size={18} color="#FFF" style={{ marginRight: 8 }} />
        <Text style={styles.primaryButtonText}>Compartir QR</Text>
      </Pressable>

      {/* Secondary buttons */}
      <Pressable
        style={({ pressed }) => [
          styles.secondaryButton,
          pressed && { opacity: 0.7 },
        ]}
        onPress={handleDownload}
      >
        <Ionicons name="download-outline" size={17} color={C.TEXT_SECONDARY} style={{ marginRight: 6 }} />
        <Text style={styles.secondaryButtonText}>Descargar para imprimir</Text>
      </Pressable>

      <Pressable
        style={({ pressed }) => [
          styles.secondaryButton,
          pressed && { opacity: 0.7 },
        ]}
        onPress={handlePrint}
      >
        <Ionicons name="print-outline" size={17} color={C.TEXT_SECONDARY} style={{ marginRight: 6 }} />
        <Text style={styles.secondaryButtonText}>Imprimir</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.BG_SCREEN,
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 60,
  },

  back: {
    alignSelf: "flex-start",
    marginBottom: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  backText: {
    color: C.VIOLET_PRIMARY,
    fontSize: 16,
    fontWeight: "600",
  },

  title: {
    color: C.TEXT_PRIMARY,
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 6,
    textAlign: "center",
  },
  subtitle: {
    color: C.TEXT_SECONDARY,
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 28,
    maxWidth: 300,
    lineHeight: 20,
  },

  // QR
  qrWrapper: {
    marginBottom: 20,
    alignItems: "center",
    position: "relative",
  },
  qrBox: {
    width: 230,
    height: 230,
    borderRadius: RADIUS.xl,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: C.VIOLET_BORDER,
    padding: 14,
    shadowColor: C.VIOLET_PRIMARY,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  corner: {
    position: "absolute",
    width: 18,
    height: 18,
    borderColor: C.VIOLET_PRIMARY,
    borderWidth: 3,
  },
  cornerTL: { top: -3, left: -3, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 6 },
  cornerTR: { top: -3, right: -3, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 6 },
  cornerBL: { bottom: -3, left: -3, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 6 },
  cornerBR: { bottom: -3, right: -3, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 6 },

  urlText: {
    color: C.VIOLET_LIGHT,
    fontSize: 11,
    textAlign: "center",
    marginBottom: 24,
    maxWidth: 320,
  },

  primaryButton: {
    width: "100%",
    maxWidth: 320,
    backgroundColor: C.VIOLET_PRIMARY,
    paddingVertical: 18,
    borderRadius: RADIUS.md,
    alignItems: "center",
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "center",
    ...SHADOW.violet,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },

  secondaryButton: {
    width: "100%",
    maxWidth: 320,
    backgroundColor: C.BG_CARD,
    paddingVertical: 16,
    borderRadius: RADIUS.md,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: C.BORDER,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "center",
    ...SHADOW.sm,
  },
  secondaryButtonText: {
    color: C.TEXT_SECONDARY,
    fontSize: 15,
    fontWeight: "600",
  },
});
