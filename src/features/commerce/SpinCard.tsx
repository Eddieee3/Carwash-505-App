import { Sparkles } from "lucide-react-native";
import { Alert } from "@/lib/alert";
import { Button, Card, StatusBadge, Text } from "@/design";
import { bookingErrorMessage } from "@/features/booking/errors";
import { currentLocale, getCopy } from "@/i18n";
import { useCommerce, useMySpin, useSpin } from "./api";

/**
 * Ruleta tras un servicio completado. El premio lo decide el servidor; aquí solo se revela
 * (sin animación de giro: respeta "reducir movimiento" y no sugiere que la app influya en el resultado).
 */
export function SpinCard({ bookingId }: { bookingId: string }) {
  const c = getCopy();
  const locale = currentLocale();
  const commerce = useCommerce();
  const enabled = !!commerce.data?.spin_enabled;
  const mine = useMySpin(bookingId, enabled);
  const spin = useSpin(bookingId);

  if (!enabled || mine.isLoading) return null;
  const result = mine.data ?? spin.data;

  return (
    <Card>
      <Text variant="eyebrow" tone="accent">
        {c.spin.title}
      </Text>
      {result ? (
        <StatusBadge label={locale === "en" ? result.label_en : result.label_es} tone={result.points > 0 ? "success" : "neutral"} icon={Sparkles} />
      ) : (
        <>
          <Text tone="muted">{c.spin.body(commerce.data!.spin_window_days)}</Text>
          <Button
            label={c.spin.cta}
            loading={spin.isPending}
            onPress={() => spin.mutate(undefined, { onError: (e) => Alert.alert(bookingErrorMessage(e, c)) })}
            testID="spin"
          />
        </>
      )}
    </Card>
  );
}
