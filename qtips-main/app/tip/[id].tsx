import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { C, RADIUS, SHADOW } from "../../constants/theme";
import { FUNCTIONS_URL } from "../../lib/functions";

const PRESET_AMOUNTS = [2, 5, 10];

type Restaurant = {
  name: string;
  address: string;
  category: string;
  tipDistributionMode: string;
  canReceiveTips: boolean;
};

type Employee = { id: string; name: string; role: string };

function getInitials(name: string): string {
  return name.trim().split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
}

export default function TipPage() {
  const params = useLocalSearchParams<{ id: string }>();
  const restaurantId = params.id;

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    if (!restaurantId) {
      setError("Enlace inválido");
      setLoading(false);
      return;
    }

    fetch(`${FUNCTIONS_URL}/getRestaurant?restaurantId=${encodeURIComponent(restaurantId)}`)
      .then((r) => r.json() as Promise<{ error?: string; restaurant?: Restaurant; employees?: Employee[] }>)
      .then((data) => {
        if (data.error) { setError(data.error); return; }
        if (data.restaurant) setRestaurant(data.restaurant);
        setEmployees(data.employees ?? []);
      })
      .catch(() => setError("No se pudo cargar la información del restaurante"))
      .finally(() => setLoading(false));
  }, [restaurantId]);

  const finalAmount: number = showCustom
    ? parseFloat(customAmount.replace(",", ".")) || 0
    : selectedAmount ?? 0;

  const employeeRequired =
    restaurant?.tipDistributionMode === "employee_required" && employees.length > 0;
  const employeeOk = !employeeRequired || selectedEmployee !== null;

  const canPay = finalAmount >= 0.5 && finalAmount <= 500 && employeeOk;

  const handlePay = async () => {
    if (!restaurant?.canReceiveTips) {
      Alert.alert("No disponible", "Este restaurante no puede recibir pagos todavía.");
      return;
    }
    if (!canPay) {
      Alert.alert("Importe inválido", "El importe debe estar entre 0,50€ y 500€.");
      return;
    }

    setPaying(true);
    try {
      const response = await fetch(`${FUNCTIONS_URL}/createCheckoutSession`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantId,
          amount: finalAmount,
          employeeId: selectedEmployee?.id ?? "",
          employeeName: selectedEmployee?.name ?? "",
        }),
      });
      const data = await response.json() as { url?: string; error?: string };
      if (!response.ok || data.error) throw new Error(data.error ?? "Error al iniciar el pago");
      if (Platform.OS === "web") {
        window.location.href = data.url as string;
      } else {
        await Linking.openURL(data.url as string);
      }
    } catch (err: unknown) {
      const e = err as Error;
      Alert.alert("Error", e.message ?? "No se pudo iniciar el pago. Inténtalo de nuevo.");
    } finally {
      setPaying(false);
    }
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={C.VIOLET_PRIMARY} />
        <Text style={styles.loadingText}>Cargando...</Text>
      </View>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (error || !restaurant) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={48} color={C.ERROR} />
        <Text style={styles.errorTitle}>Enlace no disponible</Text>
        <Text style={styles.errorText}>{error || "No se pudo cargar el restaurante."}</Text>
      </View>
    );
  }

  // ── Cannot receive tips ────────────────────────────────────────────────────
  if (!restaurant.canReceiveTips) {
    return (
      <View style={styles.center}>
        <Ionicons name="hourglass-outline" size={48} color={C.TEXT_TERTIARY} />
        <Text style={styles.errorTitle}>No disponible</Text>
        <Text style={styles.errorText}>
          Este restaurante está configurando su cuenta de pagos. Inténtalo más tarde.
        </Text>
      </View>
    );
  }

  const showEmployeeSelection =
    restaurant.tipDistributionMode === "employee_optional" ||
    restaurant.tipDistributionMode === "employee_required";

  // ── Main UI ────────────────────────────────────────────────────────────────
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      {/* Restaurant header */}
      <View style={styles.restaurantHeader}>
        <View style={styles.restaurantAvatar}>
          <Text style={styles.restaurantAvatarText}>{getInitials(restaurant.name)}</Text>
        </View>
        <Text style={styles.restaurantName}>{restaurant.name}</Text>
        {restaurant.address ? (
          <Text style={styles.restaurantAddress}>{restaurant.address}</Text>
        ) : null}
      </View>

      <Text style={styles.tipQuestion}>¿Quieres dejar una propina?</Text>

      {/* Employee selection */}
      {showEmployeeSelection && employees.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>¿A quién va dirigida?</Text>
          <View style={styles.employeeGrid}>
            {restaurant.tipDistributionMode === "employee_optional" && (
              <Pressable
                style={[
                  styles.employeeChip,
                  selectedEmployee === null && styles.employeeChipActive,
                ]}
                onPress={() => setSelectedEmployee(null)}
              >
                <Ionicons
                  name="restaurant-outline"
                  size={16}
                  color={selectedEmployee === null ? C.VIOLET_PRIMARY : C.TEXT_TERTIARY}
                />
                <Text
                  style={[
                    styles.employeeChipText,
                    selectedEmployee === null && styles.employeeChipTextActive,
                  ]}
                >
                  Al restaurante
                </Text>
              </Pressable>
            )}
            {employees.map((emp) => (
              <Pressable
                key={emp.id}
                style={[
                  styles.employeeChip,
                  selectedEmployee?.id === emp.id && styles.employeeChipActive,
                ]}
                onPress={() => setSelectedEmployee(emp)}
              >
                <Text
                  style={[
                    styles.employeeChipText,
                    selectedEmployee?.id === emp.id && styles.employeeChipTextActive,
                  ]}
                >
                  {emp.name}
                </Text>
                {emp.role ? (
                  <Text
                    style={[
                      styles.employeeChipRole,
                      selectedEmployee?.id === emp.id && { color: C.VIOLET_PRIMARY },
                    ]}
                  >
                    {emp.role}
                  </Text>
                ) : null}
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {/* Amount selection */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Elige el importe</Text>
        <View style={styles.amountsGrid}>
          {PRESET_AMOUNTS.map((amt) => (
            <Pressable
              key={amt}
              style={({ pressed }) => [
                styles.amountBtn,
                selectedAmount === amt && !showCustom && styles.amountBtnActive,
                pressed && { transform: [{ scale: 0.96 }] },
              ]}
              onPress={() => {
                setSelectedAmount(amt);
                setShowCustom(false);
                setCustomAmount("");
              }}
            >
              <Text
                style={[
                  styles.amountText,
                  selectedAmount === amt && !showCustom && styles.amountTextActive,
                ]}
              >
                {amt} €
              </Text>
            </Pressable>
          ))}
          <Pressable
            style={({ pressed }) => [
              styles.amountBtn,
              showCustom && styles.amountBtnActive,
              pressed && { transform: [{ scale: 0.96 }] },
            ]}
            onPress={() => {
              setShowCustom(true);
              setSelectedAmount(null);
            }}
          >
            <Text style={[styles.amountText, showCustom && styles.amountTextActive]}>
              Otro
            </Text>
          </Pressable>
        </View>

        {showCustom && (
          <View style={styles.customWrapper}>
            <Text style={styles.euroSign}>€</Text>
            <TextInput
              style={styles.customInput}
              value={customAmount}
              onChangeText={setCustomAmount}
              placeholder="0,00"
              placeholderTextColor={C.TEXT_TERTIARY}
              keyboardType="decimal-pad"
              autoFocus
            />
          </View>
        )}
      </View>

      {/* Selected summary */}
      {finalAmount > 0 && (
        <View style={styles.summaryBox}>
          <Text style={styles.summaryText}>
            {selectedEmployee
              ? `${finalAmount.toFixed(2)} € para ${selectedEmployee.name}`
              : `${finalAmount.toFixed(2)} € al restaurante`}
          </Text>
        </View>
      )}

      {/* Pay button */}
      <Pressable
        style={({ pressed }) => [
          styles.payBtn,
          (!canPay || paying) && styles.payBtnDisabled,
          pressed && canPay && !paying && { transform: [{ scale: 0.97 }] },
        ]}
        onPress={handlePay}
        disabled={!canPay || paying}
      >
        {paying ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <>
            <Ionicons name="card-outline" size={20} color="#FFF" style={{ marginRight: 8 }} />
            <Text style={styles.payBtnText}>
              {!employeeOk
                ? "Elige a quién va la propina"
                : canPay
                ? `Pagar ${finalAmount.toFixed(2)} €`
                : "Selecciona un importe"}
            </Text>
          </>
        )}
      </Pressable>

      <Text style={styles.secureNote}>
        <Ionicons name="lock-closed-outline" size={12} color={C.TEXT_TERTIARY} />{" "}
        Pago seguro · Sin registro necesario
      </Text>
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
    paddingBottom: 48,
    maxWidth: 480,
    width: "100%",
    alignSelf: "center",
    alignItems: "center",
  },

  // Restaurant header
  restaurantHeader: {
    alignItems: "center",
    marginBottom: 28,
    marginTop: 20,
  },
  restaurantAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: C.VIOLET_PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    ...SHADOW.violet,
  },
  restaurantAvatarText: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "800",
  },
  restaurantName: {
    fontSize: 24,
    fontWeight: "800",
    color: C.TEXT_PRIMARY,
    textAlign: "center",
  },
  restaurantAddress: {
    fontSize: 13,
    color: C.TEXT_TERTIARY,
    marginTop: 4,
    textAlign: "center",
  },

  tipQuestion: {
    fontSize: 18,
    fontWeight: "700",
    color: C.TEXT_PRIMARY,
    marginBottom: 24,
    textAlign: "center",
  },

  // Sections
  section: {
    width: "100%",
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: C.TEXT_TERTIARY,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 12,
  },

  // Employee chips
  employeeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  employeeChip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: RADIUS.sm,
    backgroundColor: C.BG_CARD,
    borderWidth: 1.5,
    borderColor: C.BORDER,
    alignItems: "center",
    gap: 4,
    ...SHADOW.sm,
  },
  employeeChipActive: {
    backgroundColor: C.VIOLET_SUBTLE,
    borderColor: C.VIOLET_PRIMARY,
  },
  employeeChipText: {
    fontSize: 14,
    fontWeight: "600",
    color: C.TEXT_PRIMARY,
  },
  employeeChipTextActive: {
    color: C.VIOLET_PRIMARY,
  },
  employeeChipRole: {
    fontSize: 11,
    color: C.TEXT_TERTIARY,
  },

  // Amount buttons
  amountsGrid: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
  },
  amountBtn: {
    flex: 1,
    minWidth: 64,
    paddingVertical: 18,
    borderRadius: RADIUS.md,
    backgroundColor: C.BG_CARD,
    borderWidth: 1.5,
    borderColor: C.BORDER,
    alignItems: "center",
    justifyContent: "center",
    ...SHADOW.sm,
  },
  amountBtnActive: {
    backgroundColor: C.VIOLET_PRIMARY,
    borderColor: C.VIOLET_PRIMARY,
  },
  amountText: {
    fontSize: 18,
    fontWeight: "800",
    color: C.TEXT_PRIMARY,
  },
  amountTextActive: {
    color: "#FFFFFF",
  },

  // Custom amount
  customWrapper: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.BG_CARD,
    borderRadius: RADIUS.md,
    borderWidth: 2,
    borderColor: C.VIOLET_PRIMARY,
    paddingHorizontal: 16,
    ...SHADOW.sm,
  },
  euroSign: {
    fontSize: 24,
    fontWeight: "800",
    color: C.VIOLET_PRIMARY,
    marginRight: 8,
  },
  customInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: "800",
    color: C.TEXT_PRIMARY,
    paddingVertical: 16,
  },

  // Summary
  summaryBox: {
    width: "100%",
    backgroundColor: C.GREEN_SUBTLE,
    borderRadius: RADIUS.sm,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: C.GREEN_BORDER,
    alignItems: "center",
  },
  summaryText: {
    fontSize: 15,
    fontWeight: "700",
    color: C.TEXT_PRIMARY,
    textAlign: "center",
  },

  // Pay button
  payBtn: {
    width: "100%",
    backgroundColor: C.VIOLET_PRIMARY,
    paddingVertical: 20,
    borderRadius: RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginBottom: 16,
    ...SHADOW.violet,
  },
  payBtnDisabled: {
    opacity: 0.5,
  },
  payBtnText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
  },

  secureNote: {
    fontSize: 12,
    color: C.TEXT_TERTIARY,
    textAlign: "center",
  },

  // States
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 16,
    minHeight: 400,
  },
  loadingText: {
    color: C.TEXT_TERTIARY,
    fontSize: 14,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: C.TEXT_PRIMARY,
    textAlign: "center",
  },
  errorText: {
    fontSize: 14,
    color: C.TEXT_SECONDARY,
    textAlign: "center",
    lineHeight: 20,
  },
});
