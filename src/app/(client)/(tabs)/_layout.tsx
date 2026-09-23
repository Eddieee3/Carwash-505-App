import Tabs from "expo-router/js-tabs";
import { CalendarPlus, House, UserRound, WalletCards } from "lucide-react-native";
import { dark, fonts, palette } from "@/design";
import { getCopy } from "@/i18n";

/** Cliente: Inicio, Reservar, Wallet, Perfil. */
export default function ClientTabs() {
  const c = getCopy();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: palette.ink },
        tabBarStyle: { backgroundColor: palette.graphite, borderTopColor: dark.line },
        tabBarActiveTintColor: palette.cyan,
        tabBarInactiveTintColor: palette.steel,
        tabBarLabelStyle: { fontFamily: fonts.display.medium, letterSpacing: 1, textTransform: "uppercase" },
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
        name="wallet"
        options={{
          title: c.client.tabs.wallet,
          tabBarIcon: ({ color, size }) => <WalletCards color={color} size={size} strokeWidth={1.75} />,
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
