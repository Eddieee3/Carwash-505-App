import { useState } from "react";
import { Switch, View } from "react-native";
import { Alert } from "@/lib/alert";
import { Button, Card, Field, space, Text, useTheme } from "@/design";
import { bookingErrorMessage } from "@/features/booking/errors";
import { currentLocale, getCopy } from "@/i18n";
import { formatDateLong, localDate } from "@/lib/time";
import { useEngagement, useSetMarketingPreferences } from "./api";
import { parseBirthday } from "./breakdown";

/** Perfil: consentimiento de marketing (separado del de servicio) y cumpleaños opcional (se fija una vez). */
export function MarketingPreferences() {
  const c = getCopy();
  const locale = currentLocale();
  const theme = useTheme();
  const engagement = useEngagement();
  const save = useSetMarketingPreferences();
  const [consent, setConsent] = useState<boolean | null>(null);
  const [birthday, setBirthday] = useState("");
  const [error, setError] = useState<string | undefined>();

  const data = engagement.data;
  if (!data) return null;
  const current = consent ?? data.marketing_consent;

  function submit() {
    const typed = birthday.trim();
    const parsed = typed ? parseBirthday(typed, localDate()) : null;
    if (typed && !parsed) {
      setError(c.marketing.birthdayInvalid);
      return;
    }
    setError(undefined);
    save.mutate(
      { consent: current, birthday: data?.birthday ? null : parsed },
      {
        onSuccess: () => {
          setBirthday("");
          setConsent(null);
          Alert.alert(c.marketing.saved);
        },
        onError: (e) => Alert.alert(bookingErrorMessage(e, c)),
      },
    );
  }

  return (
    <Card>
      <Text variant="eyebrow" tone="accent">
        {c.marketing.title}
      </Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
        <Text style={{ flex: 1 }}>{c.marketing.consent}</Text>
        <Switch
          value={current}
          onValueChange={setConsent}
          accessibilityLabel={c.marketing.consent}
          trackColor={{ true: theme.accent, false: theme.lineStrong }}
          testID="marketing-consent"
        />
      </View>
      <Text variant="bodySm" tone="muted">
        {c.marketing.consentHint}
      </Text>
      {data.birthday ? (
        <Text tone="muted">{c.marketing.birthdaySet(formatDateLong(`${data.birthday}T12:00:00Z`, locale))}</Text>
      ) : (
        <Field
          label={c.marketing.birthday}
          hint={c.marketing.birthdayHint}
          error={error}
          value={birthday}
          onChangeText={setBirthday}
          keyboardType="numbers-and-punctuation"
          maxLength={10}
          placeholder="1990-05-31"
        />
      )}
      <Button variant="ghost" label={c.marketing.save} onPress={submit} loading={save.isPending} testID="marketing-save" />
    </Card>
  );
}
