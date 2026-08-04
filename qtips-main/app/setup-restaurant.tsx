import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { auth, db } from "../lib/firebase";
import { C, SHADOW, RADIUS } from "../constants/theme";

const CATEGORIES = ["Restaurante", "Bar", "Cafetería", "Pizzería", "Otro"];

export default function SetupRestaurantScreen() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingInitialData, setLoadingInitialData] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);

  // Focus states
  const [nameFocused, setNameFocused] = useState(false);
  const [addressFocused, setAddressFocused] = useState(false);
  const [phoneFocused, setPhoneFocused] = useState(false);
  const [websiteFocused, setWebsiteFocused] = useState(false);

  useEffect(() => {
    const loadRestaurant = async () => {
      const user = auth.currentUser;
      if (!user) { setLoadingInitialData(false); return; }

      try {
        const snap = await getDoc(doc(db, "restaurants", user.uid));
        if (snap.exists()) {
          const d = snap.data();
          setName(d.name ?? "");
          setAddress(d.address ?? "");
          setPhone(d.phone ?? "");
          setWebsite(d.website ?? "");
          setCategory(d.category ?? "");
          setIsEditMode(true);
        }
      } catch {
        Alert.alert("Error", "No se pudo cargar la información del restaurante");
      } finally {
        setLoadingInitialData(false);
      }
    };

    loadRestaurant();
  }, []);

  const handleSave = async () => {
    if (!name.trim() || !address.trim()) {
      Alert.alert("Campos requeridos", "El nombre y la dirección son obligatorios");
      return;
    }

    const user = auth.currentUser;
    if (!user) { Alert.alert("Error", "Usuario no autenticado"); return; }

    try {
      setLoading(true);
      await setDoc(
        doc(db, "restaurants", user.uid),
        {
          name: name.trim(),
          address: address.trim(),
          phone: phone.trim(),
          website: website.trim(),
          category: category,
          ownerId: user.uid,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      if (!isEditMode) {
        await setDoc(doc(db, "restaurants", user.uid), { createdAt: serverTimestamp() }, { merge: true });
      }

      Alert.alert(
        "Guardado",
        isEditMode ? "Restaurante actualizado correctamente" : "Restaurante creado correctamente"
      );

      router.replace(isEditMode ? "/settings" : "/home");
    } catch {
      Alert.alert("Error", "No se pudo guardar el restaurante");
    } finally {
      setLoading(false);
    }
  };

  if (loadingInitialData) {
    return (
      <View style={[styles.screen, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={C.VIOLET_PRIMARY} />
        <Text style={styles.loadingText}>Cargando...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.card}>
        {isEditMode && (
          <TouchableOpacity onPress={() => router.back()} style={styles.backRow}>
            <Ionicons name="chevron-back" size={18} color={C.VIOLET_PRIMARY} />
            <Text style={styles.backText}>Volver</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.title}>
          {isEditMode ? "Editar restaurante" : "Configura tu restaurante"}
        </Text>
        <Text style={styles.subtitle}>
          {isEditMode
            ? "Actualiza los datos de tu local"
            : "Rellena los datos básicos para empezar a recibir propinas"}
        </Text>

        {/* Datos básicos */}
        <Text style={styles.sectionLabel}>DATOS BÁSICOS</Text>

        <Text style={styles.label}>Nombre del restaurante *</Text>
        <View style={[styles.inputWrapper, nameFocused && styles.inputWrapperFocused]}>
          <Ionicons
            name="storefront-outline"
            size={16}
            color={nameFocused ? C.VIOLET_PRIMARY : C.TEXT_TERTIARY}
            style={styles.inputIcon}
          />
          <TextInput
            style={styles.input}
            placeholder="Ej. La Taberna de Miguel"
            placeholderTextColor={C.TEXT_TERTIARY}
            value={name}
            onChangeText={setName}
            onFocus={() => setNameFocused(true)}
            onBlur={() => setNameFocused(false)}
          />
        </View>

        <Text style={styles.label}>Dirección *</Text>
        <View style={[styles.inputWrapper, addressFocused && styles.inputWrapperFocused]}>
          <Ionicons
            name="location-outline"
            size={16}
            color={addressFocused ? C.VIOLET_PRIMARY : C.TEXT_TERTIARY}
            style={styles.inputIcon}
          />
          <TextInput
            style={styles.input}
            placeholder="Calle, número, ciudad"
            placeholderTextColor={C.TEXT_TERTIARY}
            value={address}
            onChangeText={setAddress}
            onFocus={() => setAddressFocused(true)}
            onBlur={() => setAddressFocused(false)}
          />
        </View>

        <Text style={styles.label}>Teléfono</Text>
        <View style={[styles.inputWrapper, phoneFocused && styles.inputWrapperFocused]}>
          <Ionicons
            name="call-outline"
            size={16}
            color={phoneFocused ? C.VIOLET_PRIMARY : C.TEXT_TERTIARY}
            style={styles.inputIcon}
          />
          <TextInput
            style={styles.input}
            placeholder="+34 600 000 000"
            placeholderTextColor={C.TEXT_TERTIARY}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            onFocus={() => setPhoneFocused(true)}
            onBlur={() => setPhoneFocused(false)}
          />
        </View>

        <Text style={styles.label}>Web o Instagram</Text>
        <View style={[styles.inputWrapper, websiteFocused && styles.inputWrapperFocused]}>
          <Ionicons
            name="globe-outline"
            size={16}
            color={websiteFocused ? C.VIOLET_PRIMARY : C.TEXT_TERTIARY}
            style={styles.inputIcon}
          />
          <TextInput
            style={styles.input}
            placeholder="https://... o @tulocal"
            placeholderTextColor={C.TEXT_TERTIARY}
            value={website}
            onChangeText={setWebsite}
            autoCapitalize="none"
            onFocus={() => setWebsiteFocused(true)}
            onBlur={() => setWebsiteFocused(false)}
          />
        </View>

        {/* Categoría */}
        <Text style={styles.sectionLabel}>TIPO DE LOCAL</Text>
        <View style={styles.categoryGrid}>
          {CATEGORIES.map((cat) => (
            <Pressable
              key={cat}
              style={({ pressed }) => [
                styles.categoryBtn,
                category === cat && styles.categoryBtnActive,
                pressed && { opacity: 0.75 },
              ]}
              onPress={() => setCategory(cat === category ? "" : cat)}
            >
              <Text style={[styles.categoryText, category === cat && styles.categoryTextActive]}>
                {cat}
              </Text>
            </Pressable>
          ))}
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.button,
            loading && styles.buttonDisabled,
            pressed && !loading && { transform: [{ scale: 0.97 }] },
          ]}
          onPress={handleSave}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? "Guardando..." : isEditMode ? "Guardar cambios" : "Guardar y continuar"}
          </Text>
        </Pressable>

        {!isEditMode && (
          <Text style={styles.requiredNote}>* Campos obligatorios</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.BG_SCREEN,
  },
  scrollContent: {
    padding: 24,
    paddingTop: 60,
    paddingBottom: 48,
    alignItems: "center",
  },
  card: {
    width: "100%",
    maxWidth: 440,
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginBottom: 20,
  },
  backText: {
    color: C.VIOLET_PRIMARY,
    fontSize: 15,
    fontWeight: "600",
  },
  title: {
    color: C.TEXT_PRIMARY,
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 8,
  },
  subtitle: {
    color: C.TEXT_SECONDARY,
    fontSize: 14,
    marginBottom: 28,
    lineHeight: 20,
  },
  sectionLabel: {
    color: C.TEXT_TERTIARY,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 12,
    marginTop: 8,
  },
  label: {
    color: C.TEXT_PRIMARY,
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6,
    marginTop: 12,
  },

  // Inputs
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.BG_CARD,
    borderWidth: 1.5,
    borderColor: C.BORDER_INPUT,
    borderRadius: RADIUS.sm,
    ...SHADOW.sm,
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
    padding: 16,
    fontSize: 15,
  },

  // Category
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 8,
  },
  categoryBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: RADIUS.full,
    backgroundColor: C.BG_CARD,
    borderWidth: 1.5,
    borderColor: C.BORDER,
  },
  categoryBtnActive: {
    backgroundColor: C.VIOLET_SUBTLE,
    borderColor: C.VIOLET_PRIMARY,
  },
  categoryText: {
    color: C.TEXT_TERTIARY,
    fontSize: 14,
    fontWeight: "500",
  },
  categoryTextActive: {
    color: C.VIOLET_PRIMARY,
    fontWeight: "700",
  },

  // Button
  button: {
    backgroundColor: C.VIOLET_PRIMARY,
    paddingVertical: 18,
    borderRadius: RADIUS.md,
    alignItems: "center",
    marginTop: 28,
    ...SHADOW.violet,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  requiredNote: {
    color: C.TEXT_TERTIARY,
    fontSize: 12,
    textAlign: "center",
    marginTop: 16,
  },
  loadingText: {
    color: C.TEXT_SECONDARY,
    marginTop: 16,
    textAlign: "center",
  },
});
