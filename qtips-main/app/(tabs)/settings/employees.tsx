import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
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
import { auth, db } from "../../../lib/firebase";
import { C, SHADOW, RADIUS } from "../../../constants/theme";

type Employee = {
  id: string;
  name: string;
  role: string;
};

export default function EmployeesScreen() {
  const router = useRouter();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [nameFocused, setNameFocused] = useState(false);
  const [roleFocused, setRoleFocused] = useState(false);

  const loadEmployees = async () => {
    const user = auth.currentUser;

    if (!user) {
      setLoading(false);
      Alert.alert("Error", "Usuario no autenticado");
      return;
    }

    try {
      const employeesRef = collection(db, "restaurants", user.uid, "employees");
      const employeesQuery = query(employeesRef, orderBy("createdAt", "desc"));
      const snapshot = await getDocs(employeesQuery);

      const employeesList: Employee[] = snapshot.docs.map((docItem) => ({
        id: docItem.id,
        name: docItem.data().name ?? "",
        role: docItem.data().role ?? "",
      }));

      setEmployees(employeesList);
    } catch (error: any) {
      console.log("Load employees error:", error);
      Alert.alert("Error", error?.message || "No se pudieron cargar los empleados");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  const handleAddEmployee = async () => {
    const user = auth.currentUser;

    if (!user) {
      Alert.alert("Error", "Usuario no autenticado");
      return;
    }

    if (!name.trim() || !role.trim()) {
      Alert.alert("Error", "Completa nombre y puesto");
      return;
    }

    try {
      setSaving(true);

      const employeesRef = collection(db, "restaurants", user.uid, "employees");

      await addDoc(employeesRef, {
        name: name.trim(),
        role: role.trim(),
        createdAt: serverTimestamp(),
      });

      setName("");
      setRole("");

      await loadEmployees();
    } catch (error: any) {
      console.log("Add employee error:", error);
      Alert.alert("Error", error?.message || "No se pudo añadir el empleado");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEmployee = (employeeId: string, employeeName: string) => {
    Alert.alert(
      "Eliminar empleado",
      `¿Seguro que quieres eliminar a ${employeeName}?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            const user = auth.currentUser;

            if (!user) {
              Alert.alert("Error", "Usuario no autenticado");
              return;
            }

            try {
              const employeeRef = doc(
                db,
                "restaurants",
                user.uid,
                "employees",
                employeeId
              );

              await deleteDoc(employeeRef);
              await loadEmployees();
            } catch (error: any) {
              console.log("Delete employee error:", error);
              Alert.alert("Error", error?.message || "No se pudo eliminar el empleado");
            }
          },
        },
      ]
    );
  };

  function getInitials(n: string): string {
    return n.trim().split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backRow}>
            <Ionicons name="chevron-back" size={18} color={C.VIOLET_PRIMARY} />
            <Text style={styles.back}>Volver</Text>
          </TouchableOpacity>

          <Text style={styles.title}>Empleados</Text>
          <Text style={styles.subtitle}>Gestiona quién recibe propinas</Text>

          {/* Add employee form */}
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Añadir empleado</Text>

            <View style={[styles.inputWrapper, nameFocused && styles.inputWrapperFocused]}>
              <Ionicons
                name="person-outline"
                size={16}
                color={nameFocused ? C.VIOLET_PRIMARY : C.TEXT_TERTIARY}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Nombre"
                placeholderTextColor={C.TEXT_TERTIARY}
                value={name}
                onChangeText={setName}
                onFocus={() => setNameFocused(true)}
                onBlur={() => setNameFocused(false)}
              />
            </View>

            <View style={[styles.inputWrapper, roleFocused && styles.inputWrapperFocused]}>
              <Ionicons
                name="briefcase-outline"
                size={16}
                color={roleFocused ? C.VIOLET_PRIMARY : C.TEXT_TERTIARY}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Puesto (ej. Camarero)"
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
                saving && styles.buttonDisabled,
                pressed && !saving && { transform: [{ scale: 0.97 }] },
              ]}
              onPress={handleAddEmployee}
              disabled={saving}
            >
              <Ionicons name="add-circle-outline" size={18} color="#FFF" style={{ marginRight: 6 }} />
              <Text style={styles.addText}>
                {saving ? "Añadiendo..." : "Añadir empleado"}
              </Text>
            </Pressable>
          </View>

          {/* Employee list */}
          <View style={styles.listSection}>
            <Text style={styles.listTitle}>Plantilla</Text>

            {loading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color={C.VIOLET_PRIMARY} />
                <Text style={styles.loadingText}>Cargando empleados...</Text>
              </View>
            ) : employees.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="people-outline" size={36} color={C.BORDER} />
                <Text style={styles.emptyTitle}>Todavía no hay empleados</Text>
                <Text style={styles.emptyText}>
                  Añade el primero para empezar a organizar las propinas.
                </Text>
              </View>
            ) : (
              <View style={styles.list}>
                {employees.map((employee) => (
                  <View key={employee.id} style={styles.employee}>
                    <View style={styles.employeeAvatar}>
                      <Text style={styles.employeeAvatarText}>
                        {getInitials(employee.name)}
                      </Text>
                    </View>
                    <View style={styles.employeeBody}>
                      <Text style={styles.name}>{employee.name}</Text>
                      <Text style={styles.role}>{employee.role}</Text>
                    </View>

                    <TouchableOpacity
                      onPress={() =>
                        handleDeleteEmployee(employee.id, employee.name)
                      }
                      activeOpacity={0.85}
                      style={styles.deleteButton}
                    >
                      <Ionicons name="trash-outline" size={16} color={C.ERROR} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.BG_SCREEN,
  },
  scrollContent: {
    padding: 24,
    alignItems: "center",
  },
  container: {
    maxWidth: 520,
    width: "100%",
    alignSelf: "center",
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginBottom: 12,
  },
  back: {
    color: C.VIOLET_PRIMARY,
    fontSize: 15,
    fontWeight: "600",
  },
  title: {
    color: C.TEXT_PRIMARY,
    fontSize: 28,
    fontWeight: "800",
  },
  subtitle: {
    color: C.TEXT_SECONDARY,
    marginTop: 6,
    marginBottom: 20,
    fontSize: 14,
  },

  // Form card
  formCard: {
    backgroundColor: C.BG_CARD,
    borderRadius: RADIUS.lg,
    padding: 18,
    marginBottom: 22,
    ...SHADOW.md,
    borderWidth: 1,
    borderColor: C.BORDER,
  },
  formTitle: {
    color: C.TEXT_PRIMARY,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 14,
  },
  inputWrapper: {
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
    paddingLeft: 12,
    paddingRight: 6,
  },
  input: {
    flex: 1,
    color: C.TEXT_PRIMARY,
    padding: 14,
    fontSize: 15,
  },
  addButton: {
    marginTop: 6,
    backgroundColor: C.VIOLET_PRIMARY,
    borderRadius: RADIUS.sm,
    paddingVertical: 14,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    ...SHADOW.violetSm,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  addText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },

  // List section
  listSection: {
    marginTop: 4,
  },
  listTitle: {
    color: C.TEXT_PRIMARY,
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 14,
  },
  list: {
    gap: 10,
  },
  employee: {
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
  employeeAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.VIOLET_SUBTLE,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: C.VIOLET_BORDER,
  },
  employeeAvatarText: {
    color: C.VIOLET_PRIMARY,
    fontSize: 13,
    fontWeight: "800",
  },
  employeeBody: {
    flex: 1,
  },
  name: {
    color: C.TEXT_PRIMARY,
    fontSize: 15,
    fontWeight: "700",
  },
  role: {
    color: C.TEXT_TERTIARY,
    fontSize: 12,
    marginTop: 2,
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.xs,
    backgroundColor: C.ERROR_SUBTLE,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#FECDD3",
  },

  // States
  loadingBox: {
    paddingVertical: 40,
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    color: C.TEXT_TERTIARY,
    fontSize: 13,
  },
  emptyBox: {
    backgroundColor: C.BG_CARD,
    borderRadius: RADIUS.md,
    padding: 28,
    alignItems: "center",
    gap: 8,
    ...SHADOW.sm,
    borderWidth: 1,
    borderColor: C.BORDER,
  },
  emptyTitle: {
    color: C.TEXT_PRIMARY,
    fontSize: 15,
    fontWeight: "700",
    marginTop: 8,
  },
  emptyText: {
    color: C.TEXT_SECONDARY,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },
});
