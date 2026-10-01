import { router, Stack, useLocalSearchParams } from "expo-router";
import { MessageSquareWarning } from "lucide-react-native";
import { ActivityIndicator, View } from "react-native";
import { Button, Card, EmptyState, palette, Screen, StatusBadge, Text } from "@/design";
import { PhotoGallery } from "@/features/evidence/PhotoGallery";
import { ticketShortId, useMyTickets, useSignedUrls, useTicketEvents } from "@/features/support/api";
import { TICKET_STATUS_STYLE } from "@/features/support/status";
import { currentLocale, getCopy } from "@/i18n";
import { formatDateLong, formatTime } from "@/lib/time";

/**
 * Detalle de una incidencia propia (S01/S02): mensaje, fotos, reserva relacionada, respuesta del negocio e historial de
 * estados con fecha. RLS: el cliente solo ve sus incidencias y su historial.
 */
export default function TicketDetail() {
  const c = getCopy();
  const locale = currentLocale();
  const { id } = useLocalSearchParams<{ id: string }>();
  const tickets = useMyTickets();
  const ticket = (tickets.data ?? []).find((t) => t.id === id) ?? null;
  const events = useTicketEvents(ticket ? id : null);
  const paths = (ticket?.media ?? []).map((m) => m.storage_path);
  const urls = useSignedUrls(paths);
  const when = (iso: string) => `${formatDateLong(iso, locale)} · ${formatTime(iso, locale)}`;

  if (tickets.isLoading) {
    return (
      <Screen edges={["bottom"]}>
        <ActivityIndicator color={palette.cyan} accessibilityLabel={c.common.loading} />
      </Screen>
    );
  }
  if (!ticket) {
    return (
      <Screen edges={["bottom"]}>
        <Stack.Screen options={{ title: c.support.title }} />
        <EmptyState
          icon={MessageSquareWarning}
          title={tickets.isError ? c.support.loadError : c.support.notFound}
          action={tickets.isError ? { label: c.common.retry, onPress: () => tickets.refetch() } : undefined}
        />
      </Screen>
    );
  }
  const style = TICKET_STATUS_STYLE[ticket.status];

  return (
    <Screen edges={["bottom"]}>
      <Stack.Screen options={{ title: `#${ticketShortId(ticket.id)}` }} />
      <Card>
        <StatusBadge label={c.support.status[ticket.status]} tone={style.tone} icon={style.icon} />
        <Text variant="displaySm">{c.support.kinds[ticket.kind]}</Text>
        <Text tone="muted">{when(ticket.created_at)}</Text>
        <Text>{ticket.description}</Text>
        <PhotoGallery photos={paths.filter((p) => urls.data?.[p]).map((p) => ({ id: p, url: urls.data![p] }))} />
      </Card>

      {ticket.booking ? (
        <Card>
          <Text variant="eyebrow" tone="accent">
            {c.support.relatedBooking}
          </Text>
          <Text>{ticket.booking.reference_code}</Text>
          <Text tone="muted">
            {[
              when(ticket.booking.starts_at),
              ticket.booking.service ? (locale === "en" ? ticket.booking.service.name_en : ticket.booking.service.name_es) : null,
              [ticket.booking.vehicle?.make, ticket.booking.vehicle?.model, ticket.booking.vehicle?.plate].filter(Boolean).join(" ") || null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </Text>
          <View style={{ alignSelf: "flex-start" }}>
            <Button variant="quiet" label={c.garage.viewBooking} onPress={() => router.push(`/booking/${ticket.booking!.id}`)} />
          </View>
        </Card>
      ) : null}

      <Card>
        <Text variant="eyebrow" tone="accent">
          {c.support.answerFromShop}
        </Text>
        {ticket.resolution ? <Text>{ticket.resolution}</Text> : <Text tone="muted">{c.support.noAnswerYet}</Text>}
      </Card>

      <Card>
        <Text variant="eyebrow" tone="accent">
          {c.support.history}
        </Text>
        {events.isLoading ? <ActivityIndicator color={palette.cyan} accessibilityLabel={c.common.loading} /> : null}
        {events.isError ? <Text tone="danger">{c.support.loadError}</Text> : null}
        {(events.data ?? []).map((e) => (
          <View key={e.id} style={{ gap: 2 }}>
            <Text variant="label">{c.support.status[e.to_status]}</Text>
            <Text variant="bodySm" tone="muted">
              {when(e.created_at)}
            </Text>
            {e.resolution ? <Text variant="bodySm">{e.resolution}</Text> : null}
          </View>
        ))}
      </Card>
    </Screen>
  );
}
