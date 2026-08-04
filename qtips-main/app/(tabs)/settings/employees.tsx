import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
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
import { EmployeeRowSkeleton } from "../../../components/ui/Skeleton";
import { C, RADIUS, SHADOW } from "../../../constants/theme";
import { auth, db } from "../../../lib/firebase";

type Employee = {
  id: string;
  name: string;
  role: string;
  status: "active" | "inactive";
};

export default function EmployeesScreen() {
  const router = useRouter();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [nameFocused, setNameFocused] = useState(false);
  const [roleFocused, setRoleFocused] = useState(false);

  const loadEmployees = async () => {
    const user = auth.currentUser;
    if (!user) { setLoading(false); return; }

    try {
      const ref = collection(db, "restaurants", user.uid, "employees");
      const snap = await getDocs(query(ref, orderBy("createdAt", "desc")));
      setEmployees(
        snap.docs.map((d) => ({
          id: d.id,
          name: d.data().name ?? "",
          role: d.data().role ?? "",
          status: d.data().status ?? "active",
        }))
      );
    } catch (error: unknown) {
      const e = error as Error;
      Alert.alert("Error", e?.message || "No se pudieron cargar los empleados");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadEmployees(); }, []);

  const handleAdd = async () => {
    const user = auth.currentUser;
    if (!user) { Alert.alert("Error", "Usuario no autenticado"); return; }
    if (!name.trim() || !role.trim()) {
      Alert.alert("Campos requeridos", "Completa nombre y puesto");
      return;
    }

    setSaving(true);
    try {
      await addDoc(collection(db, "restaurants", user.uid, "employees"), {
        name: name.trim(),
        role: role.trim(),
        status: "active",
        createdAt: serverTimestamp(),
      });
      setName("");
      setRole("");
      await loadEmployees();
    } catch (error: unknown) {
      const e = error as Error;
      Alert.alert("Error", e?.message || "No se pudo añadir el empleado");
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = (emp: Employee) => {
    Alert.alert(
      "Desactivar empleado",
      `${emp.name} dejará de aparecer en nuevas propinas. Su historial se conserva.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Desactivar",
          style: "destructive",
          onPress: async () => {
            const user = auth.currentUser;
            if (!user) return;
            try {
              await updateDoc(
                doc(db, "restaurants", user.uid, "employees", emp.id),
                { status: "inactive" }
              );
              await loadEmployees();
            } catch {
              Alert.alert("Error", "No se pudo desactivar el empleado");
            }
          },
        },
      ]
    );
  };

  const handleReactivate = async (emp: Employee) => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      await updateDoc(
        doc(db, "restaurants", user.uid, "employees", emp.id),
        { status: "active" }
      );
      await loadEmployees();
    } catch {
      Alert.alert("Error", "No se pudo reactivar el empleado");
    }
  };

  const active = employees.filter((e) => e.status === "active");
  const inactive = employees.filter((e) => e.status === "inactive");

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.container}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backRow}>
            <Ionicons name="chevron-back" size={18} color={C.VIOLET_PRIMARY} />
            <Text style={styles.back}>Volver</Text>
          </TouchableOpacity>

          <Text style={styles.title}>Empleados</Text>
          <Text style={styles.subtitle}>
            Gestiona quién aparece como opción al dejar propinas
          </Text>

          {/* Add form */}
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Añadir empleado</Text>

            <Text style={styles.fieldLabel}>Nombre *</Text>
            <View style={[styles.inputWrapper, nameFocused && styles.inputFocused]}>
              <Ionicons name="person-outline" size={16}
                color={nameFocused ? C.VIOLET_PRIMARY : C.TEXT_TERTIARY}
                style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Nombre completo"
                placeholderTextColor={C.TEXT_TERTIARY}
                value={name}
                onChangeText={setName}
                onFocus={() => setNameFocused(true)}
                onBlur={() => setNameFocused(false)}
              />
            </View>

            <Text style={styles.fieldLabel}>Puesto *</Text>
            <View style={[styles.inputWrapper, roleFocused && styles.inputFocused]}>
              <Ionicons name="briefcase-outline" size={16}
                color={roleFocused ? C.VIOLET_PRIMARY : C.TEXT_TERTIARY}
                style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Ej. Camarero, Barista"
                placeholderTextColor={C.TEXT_TERTIARY}
                value={role}
                onChangeText={setRole}
                onFocus={() => setRoleFocused(true)}
                onBlur={() => setRoleFocused(false)}
              />
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.addButton,
                saving && styles.btnDisabled,
                pressed && !saving && { transform: [{ scale: 0.97 }] },
              ]}
              onPress={handleAdd}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Ionicons name="add-circle-outline" size={18} color="#FFF" style={{ marginRight: 6 }} />
                  <Text style={styles.addText}>Añadir empleado</Text>
                </>
              )}
            </Pressable>
          </View>

          {/* Active employees */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Plantilla activa</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{active.length}</Text>
              </View>
            </View>

            {loading ? (
              <View style={styles.list}>
                <EmployeeRowSkeleton />
                <EmployeeRowSkeleton />
                <EmployeeRowSkeleton />
              </View>
            ) : active.length === 0 ? (
              <View style={styles.stateBox}>
                <Ionicons name="people-outline" size={36} color={C.BORDER} />
                <Text style={styles.stateTitle}>Sin empleados activos</Text>
                <Text style={styles.stateText}>
                  Añade empleados para que los clientes puedan elegir a quién dar la propina.
                </Text>
              </View>
            ) : (
              <View style={styles.list}>
                {active.map((emp) => (
                  <EmployeeRow
                    key={emp.id}
                    employee={emp}
                    onDeactivate={() => handleDeactivate(emp)}
                    onReactivate={undefined}
                  />
                ))}
              </View>
            )}
          </View>

          {/* Inactive employees toggle */}
          {inactive.length > 0 && (
            <View style={styles.section}>
              <Pressable
                style={({ pressed }) => [
                  styles.toggleRow,
                  pressed && { opacity: 0.7 },
                ]}
                onPress={() => setShowInactive((v) => !v)}
              >
                <Text style={styles.toggleText}>
                  Empleados desactivados ({inactive.length})
                </Text>
                <Ionicons
                  name={showInactive ? "chevron-up" : "chevron-down"}
                  size={16}
                  color={C.TEXT_TERTIARY}
                />
              </Pressable>

              {showInactive && (
                <View style={[styles.list, { marginTop: 12 }]}>
                  {inactive.map((emp) => (
                    <EmployeeRow
                      key={emp.id}
                      employee={emp}
                      onDeactivate={undefined}
                      onReactivate={() => handleReactivate(emp)}
                    />
                  ))}
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function EmployeeRow({
  employee,
  onDeactivate,
  onReactivate,
}: {
  employee: Employee;
  onDeactivate?: () => void;
  onReactivate?: () => void;
}) {
  const isInactive = employee.status === "inactive";
  return (
    <View style={[styles.row, isInactive && styles.rowInactive]}>
      <View style={[styles.avatar, isInactive && styles.avatarInactive]}>
        <Text style={[styles.avatarText, isInactive && { color: C.TEXT_TERTIARY }]}>
          {employee.name.trim().split(" ").slice(0, 2).map((w: string) => w[0]?.toUpperCase() ?? "").join("")}
        </Text>
      </View>
      <View style={styles.rowBody}>
        <Text style={[styles.rowName, isInactive && { color: C.TEXT_TERTIARY }]}>
          {employee.name}
        </Text>
        <Text style={styles.rowRole}>{employee.role}</Text>
      </View>
      {onDeactivate && (
        <TouchableOpacity style={styles.actionBtn} onPress={onDeactivate} activeOpacity={0.8}>
          <Ionicons name="pause-circle-outline" size={18} color={C.WARNING} />
        </TouchableOpacity>
      )}
      {onReactivate && (
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: "rgba(32,214,155,0.1)", borderColor: C.GREEN_BORDER }]}
          onPress={onReactivate}
          activeOpacity={0.8}
        >
          <Ionicons name="play-circle-outline" size={18} color={C.GREEN_POSITIVE} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.BG_SCREEN },
  scrollContent: { padding: 24, paddingBottom: 48, alignItems: "center" },
  container: { maxWidth: 520, width: "100%", alignSelf: "center" },

  backRow: { flexDirection: "row", alignItems: "center", gap: 2, marginBottom: 12 },
  back: { color: C.VIOLET_PRIMARY, fontSize: 15, fontWeight: "600" },
  title: { color: C.TEXT_PRIMARY, fontSize: 28, fontWeight: "800" },
  subtitle: { color: C.TEXT_SECONDARY, marginTop: 6, marginBottom: 20, fontSize: 14, lineHeight: 20 },

  formCard: {
    backgroundColor: C.BG_CARD,
    borderRadius: RADIUS.lg,
    padding: 18,
    marginBottom: 24,
    ...SHADOW.md,
    borderWidth: 1,
    borderColor: C.BORDER,
  },
  formTitle: { color: C.TEXT_PRIMARY, fontSize: 16, fontWeight: "700", marginBottom: 14 },
  fieldLabel: { color: C.TEXT_PRIMARY, fontSize: 13, fontWeight: "600", marginBottom: 6, marginTop: 4 },

  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.BG_INPUT,
    borderRadius: RADIUS.sm,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: C.BORDER_INPUT,
  },
  inputFocused: { borderColor: C.VIOLET_PRIMARY, backgroundColor: "#FAFBFF" },
  inputIcon: { paddingLeft: 12, paddingRight: 6 },
  input: { flex: 1, color: C.TEXT_PRIMARY, padding: 14, fontSize: 15 },

  addButton: {
    marginTop: 6,
    backgroundColor: C.VIOLET_PRIMARY,
    borderRadius: RADIUS.sm,
    paddingVertical: 15,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    ...SHADOW.violetSm,
  },
  btnDisabled: { opacity: 0.55 },
  addText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },

  section: { marginBottom: 20 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  sectionTitle: { color: C.TEXT_PRIMARY, fontSize: 18, fontWeight: "800" },
  countBadge: {
    backgroundColor: C.VIOLET_SUBTLE,
    borderRadius: RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: C.VIOLET_BORDER,
  },
  countText: { color: C.VIOLET_PRIMARY, fontSize: 13, fontWeight: "700" },

  list: { gap: 10 },
  row: {
    backgroundColor: C.BG_CARD,
    borderRadius: RADIUS.md,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    ...SHADOW.sm,
    borderWidth: 1,
    borderColor: C.BORDER,
  },
  rowInactive: { opacity: 0.65, backgroundColor: C.BG_INPUT },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.VIOLET_SUBTLE,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: C.VIOLET_BORDER,
  },
  avatarInactive: { backgroundColor: C.BG_INPUT, borderColor: C.BORDER },
  avatarText: { color: C.VIOLET_PRIMARY, fontSize: 13, fontWeight: "800" },
  rowBody: { flex: 1 },
  rowName: { color: C.TEXT_PRIMARY, fontSize: 15, fontWeight: "700" },
  rowRole: { color: C.TEXT_TERTIARY, fontSize: 12, marginTop: 2 },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.xs,
    backgroundColor: "#FFF3E0",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#FDE68A",
  },

  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  toggleText: { color: C.TEXT_SECONDARY, fontSize: 14, fontWeight: "600" },

  stateBox: {
    backgroundColor: C.BG_CARD,
    borderRadius: RADIUS.md,
    padding: 28,
    alignItems: "center",
    gap: 8,
    ...SHADOW.sm,
    borderWidth: 1,
    borderColor: C.BORDER,
  },
  stateTitle: { color: C.TEXT_PRIMARY, fontSize: 15, fontWeight: "700", marginTop: 8 },
  stateText: {
    color: C.TEXT_SECONDARY,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    maxWidth: 280,
  },
});
