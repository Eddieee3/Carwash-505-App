import { BlurView } from "expo-blur";
import Tabs from "expo-router/js-tabs";
import { StyleSheet } from "react-native";
import { CalendarPlus, House, ShoppingBag, UserRound } from "lucide-react-native";
import { fonts, glass, palette } from "@/design";
import { getCopy } from "@/i18n";

/** Cliente: Inicio, Reservar, Productos, Perfil. La Tarjeta VIP y los beneficios viven en Perfil (y en Apple/Google Wallet). */
export default function ClientTabs() {
  const c = getCopy();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: palette.ink },
        // Barra de vidrio: translúcida, con desenfoque y un filo de luz arriba.
        tabBarStyle: { backgroundColor: glass.bgStrong, borderTopColor: glass.highlight, borderTopWidth: StyleSheet.hairlineWidth, elevation: 0 },
        tabBarBackground: () => <BlurView intensity={glass.blur} tint="dark" style={StyleSheet.absoluteFill} />,
        tabBarActiveTintColor: palette.cyan,
        tabBarInactiveTintColor: palette.steel,
        tabBarLabelStyle: { fontFamily: fonts.display.medium, letterSpacing: 1, textTransform: "uppercase", paddingTop: 2 },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{ title: c.client.tabs.home, tabBarIcon: ({ color, size }) => <House color={color} size={size} strokeWidth={1.75} /> }}
      />
      <Tabs.Screen
        name="book"
        options={{
          title: c.client.tabs.book,
          tabBarIcon: ({ color, size }) => <CalendarPlus color={color} size={size} strokeWidth={1.75} />,
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: c.client.tabs.products,
          tabBarIcon: ({ color, size }) => <ShoppingBag color={color} size={size} strokeWidth={1.75} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: c.client.tabs.profile,
          tabBarIcon: ({ color, size }) => <UserRound color={color} size={size} strokeWidth={1.75} />,
        }}
      />
    </Tabs>
  );
}
