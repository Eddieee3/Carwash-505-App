import { LifeBuoy } from "lucide-react-native";
import { ActivityIndicator, Alert, View } from "react-native";
import { Button, Card, EmptyState, Eyebrow, palette, Screen, space, StatusBadge, Text } from "@/design";
import { bookingErrorMessage } from "@/features/booking/errors";
import { PhotoGallery } from "@/features/evidence/PhotoGallery";
import { useOpenTickets, useSignedUrls, useUpdateTicket, type Ticket } from "@/features/support/api";
import { TICKET_STATUS_STYLE } from "@/features/support/status";
import { currentLocale, getCopy } from "@/i18n";
import { formatDateLong } from "@/lib/time";

function TicketCard({ ticket }: { ticket: Ticket }) {
  const c = getCopy();
  const locale = currentLocale();
  const update = useUpdateTicket();
  const paths = ticket.media.map((m) => m.storage_path);
  const urls = useSignedUrls(paths);
  const style = TICKET_STATUS_STYLE[ticket.status];
  const fail = (e: unknown) => Alert.alert(bookingErrorMessage(e, c));

  return (
    <Card>
      <StatusBadge label={c.support.status[ticket.status]} tone={style.tone} icon={style.icon} />
      <Text variant="displaySm">{c.support.kinds[ticket.kind]}</Text>
      <Text tone="muted">
        {[ticket.customer?.full_name ?? ticket.customer?.email, formatDateLong(ticket.created_at, locale)].filter(Boolean).join(" · ")}
      </Text>
      <Text>{ticket.description}</Text>
      <PhotoGallery photos={paths.filter((p) => urls.data?.[p]).map((p) => ({ id: p, url: urls.data![p] }))} />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
        {ticket.status === "open" ? (
          <Button
            variant="ghost"
            label={c.owner.markReview}
            onPress={() => update.mutate({ id: ticket.id, status: "in_review" }, { onError: fail })}
            disabled={update.isPending}
          />
        ) : null}
        <Button
          label={c.owner.markResolved}
          onPress={() => update.mutate({ id: ticket.id, status: "resolved" }, { onError: fail })}
          disabled={update.isPending}
        />
      </View>
    </Card>
  );
}

/** Propietario: reportes y daños preexistentes pendientes. Al cambiar el estado, el cliente recibe un aviso. */
export default function OwnerSupport() {
  const c = getCopy();
  const tickets = useOpenTickets();
  return (
    <Screen edges={["top"]}>
      <View style={{ gap: space.sm }}>
        <Eyebrow>{c.owner.eyebrow}</Eyebrow>
        <Text variant="displayLg">{c.owner.supportTitle}</Text>
      </View>
      {tickets.isLoading ? (
        <ActivityIndicator color={palette.cyan} />
      ) : (tickets.data ?? []).length === 0 ? (
        <EmptyState icon={LifeBuoy} title={c.owner.supportEmpty} />
      ) : (
        tickets.data!.map((t) => <TicketCard key={t.id} ticket={t} />)
      )}
    </Screen>
  );
}
