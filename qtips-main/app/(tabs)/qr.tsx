import { Ionicons } from "@expo/vector-icons";
import { onAuthStateChanged, type User } from "firebase/auth";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Toast } from "../../components/ui/Toast";
import { C, RADIUS, SHADOW } from "../../constants/theme";
import { useToast } from "../../hooks/use-toast";
import { auth } from "../../lib/firebase";

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function QRSkeleton() {
  return (
    <View style={styles.skeletonWrap}>
      <View style={styles.skeletonBox} />
      <ActivityIndicator size="small" color={C.VIOLET_PRIMARY} style={{ marginTop: 16 }} />
      <Text style={styles.skeletonText}>Preparando tu QR…</Text>
    </View>
  );
}

// ─── Action button ────────────────────────────────────────────────────────────

function ActionBtn({
  icon,
  label,
  onPress,
  primary = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  primary?: boolean;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        primary ? styles.primaryBtn : styles.secondaryBtn,
        pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
      ]}
      onPress={onPress}
    >
      <Ionicons
        name={icon}
        size={18}
        color={primary ? "#FFF" : C.VIOLET_PRIMARY}
        style={{ marginRight: 8 }}
      />
      <Text style={primary ? styles.primaryBtnText : styles.secondaryBtnText}>
        {label}
      </Text>
    </Pressable>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function QRScreen() {
  const svgRef = useRef<unknown>(null);
  const insets = useSafeAreaInsets();

  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const { toast, show: showToast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoadingUser(false);
    });
    return unsubscribe;
  }, []);

  const restaurantId = user?.uid ?? "";
  const APP_URL =
    process.env.EXPO_PUBLIC_APP_URL ?? "https://qtips-main.vercel.app";
  const qrValue = `${APP_URL}/tip/${restaurantId}`;

  // ── Handlers ────────────────────────────────────────────────────────────────

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

  const handleCopyLink = async () => {
    if (!restaurantId) return;
    if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(qrValue);
        showToast("Enlace copiado al portapapeles", "success");
      } catch {
        showToast("No se pudo copiar el enlace", "error");
      }
    } else {
      Alert.alert("Enlace de tu restaurante", qrValue, [
        { text: "Cerrar", style: "cancel" },
      ]);
    }
  };

  const handleDownload = () => {
    showToast("Mantén pulsado el QR para guardarlo", "info");
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loadingUser) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + 20 }]}>
        <QRSkeleton />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={[styles.screen, styles.center, { paddingTop: insets.top + 20 }]}>
        <Ionicons name="lock-closed-outline" size={44} color={C.BORDER} />
        <Text style={styles.emptyTitle}>No hay sesión activa</Text>
        <Text style={styles.emptyText}>Inicia sesión para ver tu código QR.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Toast overlay */}
      <Toast message={toast} />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerBadge}>
              <View style={styles.dotOnline} />
              <Text style={styles.headerBadgeText}>Listo para recibir propinas</Text>
            </View>
            <Text style={styles.title}>Código QR</Text>
            <Text style={styles.subtitle}>
              Los clientes escanean este código desde su móvil y dejan propina en segundos
            </Text>
          </View>

          {/* QR card */}
          <View style={styles.qrCard}>
            {/* Corner decorations */}
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />

            <View style={styles.qrInner}>
              <QRCode
                value={qrValue}
                size={180}
                getRef={(ref: unknown) => {
                  svgRef.current = ref;
                }}
                backgroundColor="#FFFFFF"
                color="#111827"
              />
            </View>

            {/* Branding strip */}
            <View style={styles.brandStrip}>
              <View style={styles.brandDot} />
              <Text style={styles.brandText}>QTips</Text>
            </View>
          </View>

          {/* URL row */}
          <Pressable
            style={({ pressed }) => [styles.urlRow, pressed && { opacity: 0.7 }]}
            onPress={handleCopyLink}
          >
            <Text style={styles.urlText} numberOfLines={1}>
              {qrValue}
            </Text>
            <Ionicons name="copy-outline" size={14} color={C.VIOLET_PRIMARY} style={{ marginLeft: 6, flexShrink: 0 }} />
          </Pressable>

          {/* Actions */}
          <View style={styles.actions}>
            <ActionBtn
              icon="share-social-outline"
              label="Compartir QR"
              onPress={handleShare}
              primary
            />
            <ActionBtn
              icon="link-outline"
              label="Copiar enlace"
              onPress={handleCopyLink}
            />
            <ActionBtn
              icon="download-outline"
              label="Guardar imagen"
              onPress={handleDownload}
            />
          </View>

          {/* Tip */}
          <View style={styles.tipBox}>
            <Ionicons name="bulb-outline" size={15} color={C.VIOLET_LIGHT} />
            <Text style={styles.tipText}>
              Imprime el QR o muéstralo en pantalla. Los clientes no necesitan instalar ninguna app.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.BG_SCREEN,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 48,
    alignItems: "center",
  },
  container: {
    width: "100%",
    maxWidth: 440,
    alignItems: "center",
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    gap: 10,
    paddingHorizontal: 32,
  },

  // Header
  header: { alignItems: "center", marginBottom: 28 },
  headerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: C.GREEN_SUBTLE,
    borderRadius: RADIUS.full,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: C.GREEN_BORDER,
    marginBottom: 14,
  },
  dotOnline: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: C.GREEN_POSITIVE,
  },
  headerBadgeText: {
    color: "#059669",
    fontSize: 12,
    fontWeight: "700",
  },
  title: {
    color: C.TEXT_PRIMARY,
    fontSize: 26,
    fontWeight: "800",
    marginBottom: 6,
    textAlign: "center",
  },
  subtitle: {
    color: C.TEXT_SECONDARY,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 300,
  },

  // QR card
  qrCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: RADIUS.xl,
    padding: 28,
    alignItems: "center",
    position: "relative",
    borderWidth: 1.5,
    borderColor: C.VIOLET_BORDER,
    ...SHADOW.violet,
    marginBottom: 12,
    width: "100%",
    maxWidth: 300,
  },
  qrInner: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
  },
  brandStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 16,
  },
  brandDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.VIOLET_PRIMARY,
  },
  brandText: {
    color: C.VIOLET_PRIMARY,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1,
  },

  // Corners
  corner: {
    position: "absolute",
    width: 20,
    height: 20,
    borderColor: C.VIOLET_PRIMARY,
    borderWidth: 3,
  },
  cornerTL: { top: -1, left: -1, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 8 },
  cornerTR: { top: -1, right: -1, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 8 },
  cornerBL: { bottom: -1, left: -1, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 8 },
  cornerBR: { bottom: -1, right: -1, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 8 },

  // URL
  urlRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.VIOLET_SUBTLE,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 24,
    width: "100%",
    maxWidth: 300,
    borderWidth: 1,
    borderColor: C.VIOLET_BORDER,
  },
  urlText: {
    flex: 1,
    color: C.VIOLET_LIGHT,
    fontSize: 11,
    fontFamily: "monospace",
  },

  // Buttons
  actions: { gap: 10, width: "100%", maxWidth: 300 },
  primaryBtn: {
    backgroundColor: C.VIOLET_PRIMARY,
    borderRadius: RADIUS.md,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    ...SHADOW.violetSm,
  },
  primaryBtnText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  secondaryBtn: {
    backgroundColor: C.BG_CARD,
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: C.VIOLET_BORDER,
    ...SHADOW.sm,
  },
  secondaryBtnText: { color: C.VIOLET_PRIMARY, fontSize: 14, fontWeight: "700" },

  // Tip
  tipBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginTop: 20,
    backgroundColor: C.VIOLET_SUBTLE,
    borderRadius: RADIUS.md,
    paddingVertical: 12,
    paddingHorizontal: 14,
    width: "100%",
    maxWidth: 300,
    borderWidth: 1,
    borderColor: C.VIOLET_BORDER,
  },
  tipText: {
    flex: 1,
    color: C.VIOLET_LIGHT,
    fontSize: 12,
    lineHeight: 18,
  },

  // Skeleton
  skeletonWrap: { alignItems: "center", paddingTop: 60 },
  skeletonBox: {
    width: 230,
    height: 230,
    borderRadius: RADIUS.xl,
    backgroundColor: C.BG_CARD,
    borderWidth: 1.5,
    borderColor: C.BORDER,
  },
  skeletonText: { color: C.TEXT_TERTIARY, fontSize: 13, marginTop: 8 },

  // Empty
  emptyTitle: { color: C.TEXT_PRIMARY, fontSize: 17, fontWeight: "700", textAlign: "center" },
  emptyText: { color: C.TEXT_SECONDARY, fontSize: 13, textAlign: "center", lineHeight: 20 },
});
