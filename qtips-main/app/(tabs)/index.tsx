import { Redirect } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { C } from "../../constants/theme";
import { auth, db } from "../../lib/firebase";

export default function IndexScreen() {
  const [loading, setLoading] = useState(true);
  const [route, setRoute] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (!user) {
          setRoute("/login");
          return;
        }

        const restaurantRef = doc(db, "restaurants", user.uid);
        const restaurantSnap = await getDoc(restaurantRef);

        if (restaurantSnap.exists()) {
          setRoute("/home");
        } else {
          setRoute("/setup-restaurant");
        }
      } catch (error) {
        console.log("Index redirect error:", error);
        setRoute("/login");
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  if (loading || !route) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: C.BG_SCREEN,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" color={C.VIOLET_PRIMARY} />
      </View>
    );
  }

  return <Redirect href={route as any} />;
}