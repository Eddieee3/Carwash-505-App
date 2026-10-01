import { Stack } from "expo-router";
import { LifeBuoy } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Alert, View } from "react-native";
import { Button, Card, ChoiceChips, EmptyState, Eyebrow, Field, palette, Screen, space, StatusBadge, Text } from "@/design";
import { bookingErrorMessage } from "@/features/booking/errors";
import { PhotoGallery } from "@/features/evidence/PhotoGallery";
import { ticketShortId, useSignedUrls, useTickets, useUpdateTicket, type Ticket, type TicketFilter } from "@/features/support/api";
import { TICKET_STATUS_STYLE } from "@/features/support/status";
import { currentLocale, getCopy } from "@/i18n";
import { formatDateLong, formatTime } from "@/lib/time";

const FILTERS: TicketFilter[] = ["pending", "in_review", "resolved"];

function TicketCard({ ticket }: { ticket: Ticket }) {
  const c = getCopy();
  const locale = currentLocale();
  const update = useUpdateTicket();
  const paths = ticket.media.map((m) => m.storage_path);
  const urls = useSignedUrls(paths);
  const style = TICKET_STATUS_STYLE[ticket.status];
  const [answer, setAnswer] = useState(ticket.resolution ?? "");
  const [error, setError] = useState<string | undefined>();
  const fail = (e: unknown) => Alert.alert(bookingErrorMessage(e, c));
  const b = ticket.booking;

  function resolve() {
    // S01: el cliente no recibe solo "Resuelto": se le explica qué se hizo.
    if (answer.trim().length < 10) {
      setError(c.support.answerRequired);
      return;
    }
    setError(undefined);
    update.mutate({ id: ticket.id, status: "resolved", resolution: answer }, { onError: fail });
  }

  return (
    <Card>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm, alignItems: "center" }}>
        <StatusBadge label={c.support.status[ticket.status]} tone={style.tone} icon={style.icon} />
        <Text variant="bodySm" tone="muted">{`#${ticketShortId(ticket.id)}`}</Text>
      </View>
      <Text variant="displaySm">{c.support.kinds[ticket.kind]}</Text>
      <Text tone="muted">
        {[ticket.customer?.full_name ?? ticket.customer?.email, formatDateLong(ticket.created_at, locale)].filter(Boolean).join(" · ")}
      </Text>
      <Text>{ticket.description}</Text>
      {b ? (
        <View style={{ gap: 2 }}>
          <Text variant="label">{c.support.relatedBooking}</Text>
          <Text variant="bodySm" tone="muted">
            {[
              b.reference_code,
              `${formatDateLong(b.starts_at, locale)} ${formatTime(b.starts_at, locale)}`,
              b.service ? (locale === "en" ? b.service.name_en : b.service.name_es) : null,
              [b.vehicle?.make, b.vehicle?.model, b.vehicle?.plate].filter(Boolean).join(" ") || null,
              b.assigned?.full_name ? c.ops.assignedTo(b.assigned.full_name) : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </Text>
        </View>
      ) : null}
      <PhotoGallery photos={paths.filter((p) => urls.data?.[p]).map((p) => ({ id: p, url: urls.data![p] }))} />

      {ticket.status === "resolved" || ticket.status === "closed" ? (
        ticket.resolution ? (
          <View style={{ gap: 2 }}>
            <Text variant="label">{c.support.answer}</Text>
            <Text>{ticket.resolution}</Text>
          </View>
        ) : null
      ) : (
        <>
          <Field label={c.support.answer} value={answer} onChangeText={setAnswer} error={error} multiline maxLength={2000} hint={c.support.answerHint} />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
            {ticket.status === "open" ? (
              <Button
                variant="ghost"
                label={c.owner.markReview}
                onPress={() => update.mutate({ id: ticket.id, status: "in_review", resolution: answer }, { onError: fail })}
                disabled={update.isPending}
              />
            ) : null}
            <Button label={c.owner.markResolved} onPress={resolve} disabled={update.isPending} />
          </View>
        </>
      )}
    </Card>
  );
}

/** Propietario · Soporte (A04/S01–S03): incidencias de clientes por estado; responder explica la resolución. */
export default function OwnerSupport() {
  const c = getCopy();
  const [filter, setFilter] = useState<TicketFilter>("pending");
  const tickets = useTickets(filter);
  return (
    <Screen edges={["top"]}>
      <Stack.Screen options={{ title: c.owner.supportTitle }} />
      <View style={{ gap: space.sm }}>
        <Eyebrow>{c.owner.eyebrow}</Eyebrow>
        <Text variant="displayLg">{c.owner.supportTitle}</Text>
      </View>
      <ChoiceChips label={c.owner.supportTitle} value={filter} onChange={setFilter} options={FILTERS.map((f) => ({ value: f, label: c.support.filters[f] }))} />
      {tickets.isLoading ? (
        <ActivityIndicator color={palette.cyan} accessibilityLabel={c.common.loading} />
      ) : tickets.isError ? (
        // S03: una falla no se presenta como "no hay incidencias".
        <EmptyState icon={LifeBuoy} title={c.support.loadError} action={{ label: c.common.retry, onPress: () => tickets.refetch() }} />
      ) : (tickets.data ?? []).length === 0 ? (
        <EmptyState icon={LifeBuoy} title={c.support.emptyFilter[filter]} />
      ) : (
        tickets.data!.map((t) => <TicketCard key={t.id} ticket={t} />)
      )}
    </Screen>
  );
}
