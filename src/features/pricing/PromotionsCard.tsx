import { router } from "expo-router";
import { Tag, Zap } from "lucide-react-native";
import { View } from "react-native";
import { Button, Card, space, StatusBadge, Text } from "@/design";
import { currentLocale, getCopy } from "@/i18n";
import { formatDateLong, formatTime } from "@/lib/time";
import { usePromotions } from "./api";
import { formatPct } from "./breakdown";

/** Inicio: promos flash reales (panel) y cupones personales vigentes. Sin datos, no se muestra nada. */
export function PromotionsCard() {
  const c = getCopy();
  const locale = currentLocale();
  const promos = usePromotions();
  const flash = promos.data?.flash ?? [];
  const offers = promos.data?.offers ?? [];
  if (flash.length === 0 && offers.length === 0) return null;
  const when = (iso: string) => `${formatDateLong(iso, locale)} ${formatTime(iso, locale)}`;

  return (
    <Card>
      {flash.map((f) => (
        <View key={f.id} style={{ gap: space.xs }}>
          <StatusBadge label={`${c.promos.flashTitle} ${formatPct(-f.pct)}`} tone="warning" icon={Zap} />
          <Text variant="displaySm">{locale === "en" ? f.label_en : f.label_es}</Text>
          <Text tone="muted">{c.promos.flashWindow(when(f.starts_at), when(f.ends_at))}</Text>
          {f.services.length > 0 ? (
            <Text variant="bodySm" tone="muted">
              {c.promos.flashServices(f.services.map((s) => (locale === "en" ? s.name_en : s.name_es)).join(", "))}
            </Text>
          ) : null}
        </View>
      ))}
      {offers.map((o) => (
        <View key={o.id} style={{ gap: space.xs }}>
          <StatusBadge label={c.promos.offerTitle} tone="success" icon={Tag} />
          <Text>{c.promos.offerBody(formatPct(-o.pct), formatDateLong(o.expires_at, locale))}</Text>
        </View>
      ))}
      <Button variant="ghost" label={c.promos.bookCta} onPress={() => router.push("/book")} />
    </Card>
  );
}
