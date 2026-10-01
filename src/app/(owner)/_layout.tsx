import Tabs from "expo-router/js-tabs";
import { ClipboardList, Ellipsis, LayoutDashboard, Package, Users } from "lucide-react-native";
import { dark, fonts, palette } from "@/design";
import { getCopy } from "@/i18n";

/**
 * Propietario (A03): Dashboard · Operación (reservas, bahías y QR) · Inventario · Equipo (cuentas y tareas) ·
 * Más (reportes, soporte, cierres y seguridad). Reportes y Soporte son pantallas de "Más" (sin pestaña propia).
 */
export default function OwnerLayout() {
  const c = getCopy();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: palette.ink },
        tabBarStyle: { backgroundColor: palette.graphite, borderTopColor: dark.line },
        tabBarActiveTintColor: palette.cyan,
        tabBarInactiveTintColor: palette.steel,
        tabBarLabelStyle: { fontFamily: fonts.display.medium, letterSpacing: 1, textTransform: "uppercase", paddingTop: 2 },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: c.owner.tabs.dashboard,
          tabBarIcon: ({ color, size }) => <LayoutDashboard color={color} size={size} strokeWidth={1.75} />,
        }}
      />
      <Tabs.Screen
        name="board"
        options={{
          title: c.owner.tabs.board,
          tabBarIcon: ({ color, size }) => <ClipboardList color={color} size={size} strokeWidth={1.75} />,
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          title: c.owner.tabs.inventory,
          tabBarIcon: ({ color, size }) => <Package color={color} size={size} strokeWidth={1.75} />,
        }}
      />
      <Tabs.Screen
        name="team"
        options={{
          title: c.team.tab,
          tabBarIcon: ({ color, size }) => <Users color={color} size={size} strokeWidth={1.75} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: c.owner.tabs.more,
          tabBarIcon: ({ color, size }) => <Ellipsis color={color} size={size} strokeWidth={1.75} />,
        }}
      />
      <Tabs.Screen name="reports" options={{ href: null, title: c.reports.title }} />
      <Tabs.Screen name="support" options={{ href: null, title: c.owner.supportTitle }} />
    </Tabs>
  );
}
