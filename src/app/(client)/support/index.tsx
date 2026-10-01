import { router, Stack } from "expo-router";
import { ChevronRight, MessageSquareWarning } from "lucide-react-native";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { Button, Card, EmptyState, palette, Screen, space, StatusBadge, Text, useTheme } from "@/design";
import { ticketShortId, useMyTickets } from "@/features/support/api";
import { TICKET_STATUS_STYLE } from "@/features/support/status";
import { currentLocale, getCopy } from "@/i18n";
import { formatDateLong } from "@/lib/time";

/** Mis incidencias (A04/S01/S03): identificador, categoría, fecha, estado y respuesta del negocio; abre el detalle. */
export default function MyTickets() {
  const c = getCopy();
  const locale = currentLocale();
  const theme = useTheme();
  const tickets = useMyTickets();

  return (
    <Screen edges={["bottom"]}>
      <Stack.Screen options={{ title: c.support.title }} />
      {tickets.isLoading ? (
        <ActivityIndicator color={palette.cyan} accessibilityLabel={c.common.loading} />
      ) : tickets.isError ? (
        // S03: una falla de carga no se presenta como "no hay incidencias".
        <EmptyState icon={MessageSquareWarning} title={c.support.loadError} action={{ label: c.common.retry, onPress: () => tickets.refetch() }} />
      ) : (tickets.data ?? []).length === 0 ? (
        <EmptyState
          icon={MessageSquareWarning}
          title={c.support.empty}
          body={c.support.emptyBody}
          action={{ label: c.support.report, onPress: () => router.push("/support/new") }}
        />
      ) : (
        tickets.data!.map((t) => {
          const style = TICKET_STATUS_STYLE[t.status];
          return (
            <Pressable
              key={t.id}
              accessibilityRole="button"
              accessibilityLabel={[`#${ticketShortId(t.id)}`, c.support.kinds[t.kind], c.support.status[t.status]].join(", ")}
              onPress={() => router.push({ pathname: "/support/[id]", params: { id: t.id } })}
            >
              <Card style={styles.card}>
                <View style={{ flex: 1, gap: space.xs }}>
                  <View style={styles.row}>
                    <StatusBadge label={c.support.status[t.status]} tone={style.tone} icon={style.icon} />
                    <Text variant="bodySm" tone="muted">{`#${ticketShortId(t.id)}`}</Text>
                  </View>
                  <Text variant="displaySm">{c.support.kinds[t.kind]}</Text>
                  <Text tone="muted">{formatDateLong(t.created_at, locale)}</Text>
                  <Text numberOfLines={2}>{t.description}</Text>
                  {t.booking ? <Text variant="bodySm" tone="muted">{c.support.linkedTo(t.booking.reference_code)}</Text> : null}
                  {t.resolution ? (
                    <View style={{ gap: 2 }}>
                      <Text variant="label">{c.support.answerFromShop}</Text>
                      <Text numberOfLines={3}>{t.resolution}</Text>
                    </View>
                  ) : null}
                </View>
                <ChevronRight size={20} color={theme.fgMuted} />
              </Card>
            </Pressable>
          );
        })
      )}
      {(tickets.data ?? []).length > 0 ? <Button label={c.support.report} onPress={() => router.push("/support/new")} testID="support-new" /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: "row", alignItems: "center", gap: space.sm },
  row: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: space.sm },
});
