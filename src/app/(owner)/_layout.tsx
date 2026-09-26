import Tabs from "expo-router/js-tabs";
import { ClipboardList, FileChartColumn, LayoutDashboard, LifeBuoy, Users } from "lucide-react-native";
import { dark, fonts, palette } from "@/design";
import { getCopy } from "@/i18n";

/** Propietario: dashboard en vivo, tablero del día, reportes, personal y soporte. Insumos y tareas: /operations. */
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
        name="reports"
        options={{
          title: c.reports.tab,
          tabBarIcon: ({ color, size }) => <FileChartColumn color={color} size={size} strokeWidth={1.75} />,
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
        name="support"
        options={{
          title: c.owner.tabs.support,
          tabBarIcon: ({ color, size }) => <LifeBuoy color={color} size={size} strokeWidth={1.75} />,
        }}
      />
    </Tabs>
  );
}
