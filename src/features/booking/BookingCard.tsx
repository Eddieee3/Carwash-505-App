import { ChevronRight } from "lucide-react-native";
import { Pressable, StyleSheet, View } from "react-native";
import { Card, space, StatusBadge, Text, useTheme } from "@/design";
import { vehicleLabel } from "@/features/garage/vehicle";
import { currentLocale, getCopy } from "@/i18n";
import { formatDateLong, formatTime } from "@/lib/time";
import type { MyBooking } from "./api";
import { STATUS_STYLE } from "./status";

export function BookingCard({ booking, onPress }: { booking: MyBooking; onPress: () => void }) {
  const c = getCopy();
  const locale = currentLocale();
  const theme = useTheme();
  const service = locale === "en" ? booking.price_snapshot.service_name_en : booking.price_snapshot.service_name_es;
  const when = `${formatDateLong(booking.starts_at, locale)} · ${formatTime(booking.starts_at, locale)}`;
  const vehicle = booking.vehicle ? [vehicleLabel(booking.vehicle, c), booking.vehicle.plate].filter(Boolean).join(" · ") : null;
  const style = STATUS_STYLE[booking.status];

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${service}, ${when}, ${c.status[booking.status]}`} onPress={onPress}>
      <Card style={styles.card}>
        <View style={styles.body}>
          <StatusBadge label={c.status[booking.status]} tone={style.tone} icon={style.icon} />
          <Text variant="displaySm">{service}</Text>
          <Text>{when}</Text>
          {vehicle ? <Text tone="muted">{vehicle}</Text> : null}
        </View>
        <ChevronRight color={theme.fgMuted} size={20} />
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: "row", alignItems: "center" },
  body: { flex: 1, gap: space.xs + 2 },
});
