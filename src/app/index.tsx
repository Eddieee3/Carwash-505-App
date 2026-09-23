import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { palette } from "@/design";
import { useAuth } from "@/features/auth/AuthProvider";
import { HOME } from "@/features/auth/home";

export default function Index() {
  const { view } = useAuth();
  if (view === "loading") {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: palette.ink }}>
        <ActivityIndicator color={palette.cyan} />
      </View>
    );
  }
  return <Redirect href={HOME[view]} />;
}
