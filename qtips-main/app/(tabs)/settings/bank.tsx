import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { auth, db } from "../../../lib/firebase";
import { C, SHADOW, RADIUS } from "../../../constants/theme";

function formatIban(raw: string): string {
  const clean = raw.replace(/\s/g, "").toUpperCase();
  return clean.match(/.{1,4}/g)?.join(" ") ?? clean;
}

function isValidIban(iban: string): boolean {
  const clean = iban.replace(/\s/g, "");
  return /^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$/.test(clean);
}

export default function BankScreen() {
  const router = useRouter();

  const [holder, setHolder] = useState("");
  const [iban, setIban] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [holderFocused, setHolderFocused] = useState(false);
  const [ibanFocused, setIbanFocused] = useState(false);

  useEffect(() => {
    const loadBankInfo = async () => {
      const user = auth.currentUser;
      if (!user) { setLoading(false); return; }

      try {
        const snap = await getDoc(doc(db, "restaurants", user.uid));
        if (snap.exists()) {
          const d = snap.data();
          setHolder(d.bankHolder ?? "");
          setIban(d.bankIban ? formatIban(d.bankIban) : "");
          if (d.bankHolder || d.bankIban) setSaved(true);
        }
      } catch {
        Alert.alert("Error", "No se pudo cargar la cuenta bancaria");
      } finally {
        setLoading(false);
      }
    };

    loadBankInfo();
  }, []);

  const handleIbanChange = (text: string) => {
    const clean = text.replace(/\s/g, "").toUpperCase();
    if (clean.length <= 24) {
      setIban(formatIban(clean));
    }
  };

  const handleSave = async () => {
    if (!holder.trim()) {
      Alert.alert("Campo requerido", "Introduce el titular de la cuenta");
      return;
    }

    const cleanIban = iban.replace(/\s/g, "");
    if (!cleanIban) {
      Alert.alert("Campo requerido", "Introduce el IBAN");
      return;
    }

    if (!isValidIban(cleanIban)) {
      Alert.alert("IBAN incorrecto", "Comprueba el formato. Ejemplo: ES91 2100 0418 4502 0005 1332");
      return;
    }

    const user = auth.currentUser;
    if (!user) { Alert.alert("Error", "Usuario no autenticado"); return; }

    try {
      setSaving(true);
      await setDoc(
        doc(db, "restaurants", user.uid),
        {
          bankHolder: holder.trim(),
          bankIban: cleanIban,
          bankUpdatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      setSaved(true);
      Alert.alert("Guardado", "Cuenta bancaria actualizada correctamente");
      router.back();
    } catch {
      Alert.alert("Error", "No se pudo guardar la cuenta bancaria");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.screen, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={C.VIOLET_PRIMARY} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.container}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backRow}>
          <Ionicons name="chevron-back" size={18} color={C.VIOLET_PRIMARY} />
          <Text style={styles.back}>Volver</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Cuenta bancaria</Text>
        <Text style={styles.subtitle}>
          Aquí recibirás las propinas de tu restaurante
        </Text>

        {saved && (
          <View style={styles.savedBadge}>
            <Ionicons name="checkmark-circle" size={16} color={C.GREEN_POSITIVE} />
            <Text style={styles.savedBadgeText}>Cuenta configurada</Text>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.label}>Titular de la cuenta</Text>
          <View style={[styles.inputWrapper, holderFocused && styles.inputWrapperFocused]}>
            <Ionicons
              name="person-outline"
              size={16}
              color={holderFocused ? C.VIOLET_PRIMARY : C.TEXT_TERTIARY}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Nombre completo o empresa"
              placeholderTextColor={C.TEXT_TERTIARY}
              value={holder}
              onChangeText={setHolder}
              autoCorrect={false}
              onFocus={() => setHolderFocused(true)}
              onBlur={() => setHolderFocused(false)}
            />
          </View>

          <Text style={styles.label}>IBAN</Text>
          <View style={[styles.inputWrapper, ibanFocused && styles.inputWrapperFocused]}>
            <Ionicons
              name="card-outline"
              size={16}
              color={ibanFocused ? C.VIOLET_PRIMARY : C.TEXT_TERTIARY}
              style={styles.inputIcon}
            />
            <TextInput
              style={[styles.input, styles.ibanInput]}
              placeholder="ES91 2100 0418 4502 0005 1332"
              placeholderTextColor={C.TEXT_TERTIARY}
              value={iban}
              onChangeText={handleIbanChange}
              autoCapitalize="characters"
              autoCorrect={false}
              keyboardType="default"
              onFocus={() => setIbanFocused(true)}
              onBlur={() => setIbanFocused(false)}
            />
          </View>
          <Text style={styles.ibanHint}>El IBAN se formatea automáticamente</Text>

          <View style={styles.infoBox}>
            <Ionicons name="shield-checkmark-outline" size={16} color={C.TEXT_TERTIARY} style={{ marginRight: 8, marginTop: 1 }} />
            <Text style={styles.infoText}>
              Tu IBAN se usa únicamente para procesar los pagos de propinas a través de nuestro proveedor de pagos. No se comparte con terceros.
            </Text>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.button,
              saving && styles.buttonDisabled,
              pressed && !saving && { transform: [{ scale: 0.97 }] },
            ]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.buttonText}>
              {saving ? "Guardando..." : "Guardar cuenta"}
            </Text>
          </Pressable>
        </View>
      </View>
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
    marginBottom: 16,
    fontSize: 14,
  },

  savedBadge: {
    backgroundColor: C.GREEN_SUBTLE,
    borderWidth: 1.5,
    borderColor: C.GREEN_BORDER,
    borderRadius: RADIUS.xs,
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignSelf: "flex-start",
    marginBottom: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  savedBadgeText: {
    color: C.GREEN_POSITIVE,
    fontSize: 13,
    fontWeight: "700",
  },

  card: {
    backgroundColor: C.BG_CARD,
    borderRadius: RADIUS.lg,
    padding: 20,
    ...SHADOW.md,
    borderWidth: 1,
    borderColor: C.BORDER,
  },
  label: {
    color: C.TEXT_PRIMARY,
    marginBottom: 8,
    marginTop: 14,
    fontSize: 14,
    fontWeight: "600",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.BG_INPUT,
    borderRadius: RADIUS.sm,
    borderWidth: 1.5,
    borderColor: C.BORDER_INPUT,
  },
  inputWrapperFocused: {
    borderColor: C.VIOLET_PRIMARY,
    backgroundColor: "#FAFBFF",
  },
  inputIcon: {
    paddingLeft: 12,
    paddingRight: 6,
  },
  input: {
    flex: 1,
    color: C.TEXT_PRIMARY,
    padding: 14,
    fontSize: 15,
  },
  ibanInput: {
    fontFamily: "monospace",
    letterSpacing: 1,
    fontSize: 15,
  },
  ibanHint: {
    color: C.TEXT_TERTIARY,
    fontSize: 11,
    marginTop: 6,
    marginBottom: 4,
  },
  infoBox: {
    backgroundColor: C.BG_INPUT,
    borderRadius: RADIUS.xs,
    padding: 14,
    marginTop: 20,
    borderWidth: 1,
    borderColor: C.BORDER,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  infoText: {
    flex: 1,
    color: C.TEXT_TERTIARY,
    fontSize: 12,
    lineHeight: 18,
  },
  button: {
    marginTop: 24,
    backgroundColor: C.VIOLET_PRIMARY,
    paddingVertical: 18,
    borderRadius: RADIUS.md,
    alignItems: "center",
    ...SHADOW.violet,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 15,
  },
});
