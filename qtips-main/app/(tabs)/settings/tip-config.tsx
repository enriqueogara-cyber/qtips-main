import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { auth, db } from "../../../lib/firebase";
import { C, RADIUS, SHADOW } from "../../../constants/theme";

type TipMode = "restaurant" | "employee_optional" | "employee_required";

type ModeOption = {
  value: TipMode;
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const MODES: ModeOption[] = [
  {
    value: "restaurant",
    label: "Al restaurante",
    description: "La propina va al restaurante en general. El cliente no elige empleado.",
    icon: "storefront-outline",
  },
  {
    value: "employee_optional",
    label: "Empleado opcional",
    description: "El cliente puede elegir un empleado o dejarlo al restaurante.",
    icon: "person-outline",
  },
  {
    value: "employee_required",
    label: "Empleado obligatorio",
    description: "El cliente debe elegir a qué empleado va dirigida la propina.",
    icon: "people-outline",
  },
];

export default function TipConfigScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<TipMode>("restaurant");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const user = auth.currentUser;
      if (!user) { setLoading(false); return; }
      try {
        const snap = await getDoc(doc(db, "restaurants", user.uid));
        if (snap.exists()) {
          const val = snap.data().tipDistributionMode;
          if (val === "employee_optional" || val === "employee_required" || val === "restaurant") {
            setMode(val);
          }
        }
      } catch {
        Alert.alert("Error", "No se pudo cargar la configuración");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSave = async () => {
    const user = auth.currentUser;
    if (!user) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "restaurants", user.uid), {
        tipDistributionMode: mode,
      });
      Alert.alert("Guardado", "La configuración se ha actualizado correctamente.");
      router.back();
    } catch {
      Alert.alert("Error", "No se pudo guardar la configuración");
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
    <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent}>
      <View style={styles.container}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backRow}>
          <Ionicons name="chevron-back" size={18} color={C.VIOLET_PRIMARY} />
          <Text style={styles.back}>Volver</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Configuración de propinas</Text>
        <Text style={styles.subtitle}>
          Elige cómo se atribuyen las propinas cuando un cliente escanea tu QR.
        </Text>

        <Text style={styles.sectionLabel}>MODO DE DISTRIBUCIÓN</Text>

        <View style={styles.optionsList}>
          {MODES.map((opt) => {
            const selected = mode === opt.value;
            return (
              <Pressable
                key={opt.value}
                style={({ pressed }) => [
                  styles.option,
                  selected && styles.optionSelected,
                  pressed && { opacity: 0.8 },
                ]}
                onPress={() => setMode(opt.value)}
              >
                <View style={[styles.optionIcon, selected && styles.optionIconSelected]}>
                  <Ionicons
                    name={opt.icon}
                    size={20}
                    color={selected ? C.VIOLET_PRIMARY : C.TEXT_TERTIARY}
                  />
                </View>
                <View style={styles.optionBody}>
                  <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>
                    {opt.label}
                  </Text>
                  <Text style={styles.optionDesc}>{opt.description}</Text>
                </View>
                <View style={[styles.radio, selected && styles.radioSelected]}>
                  {selected && <View style={styles.radioDot} />}
                </View>
              </Pressable>
            );
          })}
        </View>

        {mode !== "restaurant" && (
          <View style={styles.hint}>
            <Ionicons name="information-circle-outline" size={16} color={C.VIOLET_PRIMARY} />
            <Text style={styles.hintText}>
              Para que los clientes elijan empleado, asegúrate de tener al menos un empleado activo en Ajustes → Empleados.
            </Text>
          </View>
        )}

        <Pressable
          style={({ pressed }) => [
            styles.saveBtn,
            saving && styles.btnDisabled,
            pressed && !saving && { transform: [{ scale: 0.97 }] },
          ]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={styles.saveBtnText}>Guardar configuración</Text>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.BG_SCREEN },
  scrollContent: { padding: 24, paddingBottom: 48, alignItems: "center" },
  container: { maxWidth: 480, width: "100%", alignSelf: "center" },

  backRow: { flexDirection: "row", alignItems: "center", gap: 2, marginBottom: 16 },
  back: { color: C.VIOLET_PRIMARY, fontSize: 15, fontWeight: "600" },

  title: { color: C.TEXT_PRIMARY, fontSize: 26, fontWeight: "800", marginBottom: 8 },
  subtitle: { color: C.TEXT_SECONDARY, fontSize: 14, lineHeight: 21, marginBottom: 28 },

  sectionLabel: {
    color: C.TEXT_TERTIARY,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 12,
  },

  optionsList: { gap: 10, marginBottom: 20 },
  option: {
    backgroundColor: C.BG_CARD,
    borderRadius: RADIUS.md,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    ...SHADOW.sm,
    borderWidth: 1.5,
    borderColor: C.BORDER,
  },
  optionSelected: {
    borderColor: C.VIOLET_PRIMARY,
    backgroundColor: C.VIOLET_SUBTLE,
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: C.BG_INPUT,
    alignItems: "center",
    justifyContent: "center",
  },
  optionIconSelected: { backgroundColor: "rgba(109,74,255,0.15)" },
  optionBody: { flex: 1 },
  optionLabel: { color: C.TEXT_PRIMARY, fontSize: 15, fontWeight: "700", marginBottom: 3 },
  optionLabelSelected: { color: C.VIOLET_PRIMARY },
  optionDesc: { color: C.TEXT_SECONDARY, fontSize: 13, lineHeight: 18 },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: C.BORDER,
    alignItems: "center",
    justifyContent: "center",
  },
  radioSelected: { borderColor: C.VIOLET_PRIMARY },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: C.VIOLET_PRIMARY,
  },

  hint: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: C.VIOLET_SUBTLE,
    borderRadius: RADIUS.sm,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: C.VIOLET_BORDER,
    alignItems: "flex-start",
  },
  hintText: { flex: 1, color: C.VIOLET_DARK, fontSize: 13, lineHeight: 19 },

  saveBtn: {
    backgroundColor: C.VIOLET_PRIMARY,
    paddingVertical: 18,
    borderRadius: RADIUS.md,
    alignItems: "center",
    ...SHADOW.violet,
  },
  btnDisabled: { opacity: 0.55 },
  saveBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
});
