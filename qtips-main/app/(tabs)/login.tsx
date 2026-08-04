import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { auth, db } from "../../lib/firebase";
import { C, SHADOW, RADIUS } from "../../constants/theme";

export default function LoginScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState("");
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const getNiceAuthError = (code?: string) => {
    switch (code) {
      case "auth/invalid-email":
        return "Email inválido (ej: nombre@gmail.com).";
      case "auth/weak-password":
        return "Contraseña demasiado corta (mínimo 6 caracteres).";
      case "auth/email-already-in-use":
        return "Ese email ya está registrado. Inicia sesión.";
      case "auth/invalid-credential":
        return "Credenciales incorrectas (email o contraseña).";
      case "auth/user-not-found":
        return "No existe ese usuario. Crea cuenta primero.";
      case "auth/wrong-password":
        return "Contraseña incorrecta.";
      case "auth/network-request-failed":
        return "Error de red. Revisa tu conexión.";
      case "auth/too-many-requests":
        return "Demasiados intentos. Espera un poco y prueba otra vez.";
      default:
        return "Error al autenticar.";
    }
  };

  const handleAuth = async () => {
    setError("");

    const cleanEmail = email.trim();

    if (!cleanEmail || !password) {
      setError("Introduce email y contraseña");
      return;
    }

    if (isRegister && password.length < 6) {
      setError("La contraseña debe tener mínimo 6 caracteres.");
      return;
    }

    try {
      setLoading(true);

      let userCredential;

      if (isRegister) {
        userCredential = await createUserWithEmailAndPassword(
          auth,
          cleanEmail,
          password
        );

        router.replace("/setup-restaurant" as any);
        return;
      } else {
        userCredential = await signInWithEmailAndPassword(
          auth,
          cleanEmail,
          password
        );
      }

      const user = userCredential.user;
      const restaurantRef = doc(db, "restaurants", user.uid);
      const restaurantSnap = await getDoc(restaurantRef);

      if (restaurantSnap.exists()) {
        router.replace("/home" as any);
      } else {
        router.replace("/setup-restaurant" as any);
      }
    } catch (err: any) {
      console.log("AUTH ERROR CODE:", err?.code);
      console.log("AUTH ERROR MSG:", err?.message);
      setError(getNiceAuthError(err?.code));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      {/* Logo / brand mark */}
      <View style={styles.logoMark}>
        <Ionicons name="cash-outline" size={32} color="#FFFFFF" />
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>QTips</Text>
        <Text style={styles.subtitle}>
          {isRegister ? "Crea tu cuenta gratis" : "Bienvenido de nuevo"}
        </Text>

        {/* Email input */}
        <View style={[styles.inputWrapper, emailFocused && styles.inputWrapperFocused]}>
          <Ionicons
            name="mail-outline"
            size={18}
            color={emailFocused ? C.VIOLET_PRIMARY : C.TEXT_TERTIARY}
            style={styles.inputIcon}
          />
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={C.TEXT_TERTIARY}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            onFocus={() => setEmailFocused(true)}
            onBlur={() => setEmailFocused(false)}
          />
        </View>

        {/* Password input */}
        <View style={[styles.inputWrapper, passwordFocused && styles.inputWrapperFocused]}>
          <Ionicons
            name="lock-closed-outline"
            size={18}
            color={passwordFocused ? C.VIOLET_PRIMARY : C.TEXT_TERTIARY}
            style={styles.inputIcon}
          />
          <TextInput
            style={styles.input}
            placeholder="Contraseña"
            placeholderTextColor={C.TEXT_TERTIARY}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            onFocus={() => setPasswordFocused(true)}
            onBlur={() => setPasswordFocused(false)}
          />
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={15} color={C.ERROR} />
            <Text style={styles.error}>{error}</Text>
          </View>
        ) : null}

        <Pressable
          style={({ pressed }) => [
            styles.button,
            loading && styles.buttonDisabled,
            pressed && !loading && { transform: [{ scale: 0.97 }] },
          ]}
          onPress={handleAuth}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? "Cargando..." : isRegister ? "Crear cuenta" : "Entrar"}
          </Text>
        </Pressable>

        <TouchableOpacity
          onPress={() => setIsRegister(!isRegister)}
          style={styles.switchContainer}
          disabled={loading}
        >
          <Text style={styles.switchText}>
            {isRegister
              ? "¿Ya tienes cuenta? Inicia sesión"
              : "¿No tienes cuenta? Crear cuenta"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.BG_SCREEN,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  logoMark: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: C.VIOLET_PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    ...SHADOW.violet,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    alignItems: "center",
    backgroundColor: C.BG_CARD,
    borderRadius: RADIUS.xl,
    padding: 28,
    ...SHADOW.lg,
  },
  title: {
    color: C.TEXT_PRIMARY,
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 6,
    textAlign: "center",
  },
  subtitle: {
    color: C.TEXT_SECONDARY,
    marginBottom: 28,
    textAlign: "center",
    fontSize: 15,
  },
  inputWrapper: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.BG_INPUT,
    borderRadius: RADIUS.sm,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: C.BORDER_INPUT,
  },
  inputWrapperFocused: {
    borderColor: C.VIOLET_PRIMARY,
    backgroundColor: "#FAFBFF",
  },
  inputIcon: {
    paddingLeft: 14,
    paddingRight: 6,
  },
  input: {
    flex: 1,
    color: C.TEXT_PRIMARY,
    padding: 16,
    fontSize: 16,
  },
  errorBox: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFF1F3",
    borderRadius: RADIUS.xs,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#FECDD3",
  },
  error: {
    flex: 1,
    color: C.ERROR,
    fontSize: 13,
    fontWeight: "500",
  },
  button: {
    width: "100%",
    backgroundColor: C.VIOLET_PRIMARY,
    padding: 18,
    borderRadius: RADIUS.md,
    marginTop: 8,
    alignItems: "center",
    ...SHADOW.violet,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
    textAlign: "center",
  },
  switchContainer: {
    marginTop: 20,
  },
  switchText: {
    color: C.VIOLET_PRIMARY,
    textAlign: "center",
    fontWeight: "600",
    fontSize: 14,
  },
});
