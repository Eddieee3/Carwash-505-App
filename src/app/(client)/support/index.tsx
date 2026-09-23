import { router, Stack } from "expo-router";
import { MessageSquareWarning } from "lucide-react-native";
import { ActivityIndicator } from "react-native";
import { Button, Card, EmptyState, palette, Screen, StatusBadge, Text } from "@/design";
import { useMyTickets } from "@/features/support/api";
import { TICKET_STATUS_STYLE } from "@/features/support/status";
import { currentLocale, getCopy } from "@/i18n";
import { formatDateLong } from "@/lib/time";

export default function MyTickets() {
  const c = getCopy();
  const locale = currentLocale();
  const tickets = useMyTickets();

  return (
    <Screen edges={["bottom"]}>
      <Stack.Screen options={{ title: c.support.title }} />
      {tickets.isLoading ? (
        <ActivityIndicator color={palette.cyan} />
      ) : (tickets.data ?? []).length === 0 ? (
        <EmptyState icon={MessageSquareWarning} title={c.support.empty} />
      ) : (
        tickets.data!.map((t) => (
          <Card key={t.id}>
            <StatusBadge label={c.support.status[t.status]} tone={TICKET_STATUS_STYLE[t.status].tone} icon={TICKET_STATUS_STYLE[t.status].icon} />
            <Text variant="displaySm">{c.support.kinds[t.kind]}</Text>
            <Text tone="muted">{formatDateLong(t.created_at, locale)}</Text>
            <Text>{t.description}</Text>
            {t.resolution ? <Text tone="muted">{t.resolution}</Text> : null}
          </Card>
        ))
      )}
      <Button label={c.support.report} onPress={() => router.push("/support/new")} testID="support-new" />
    </Screen>
  );
}
