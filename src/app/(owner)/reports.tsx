import * as Linking from "expo-linking";
import { FileSpreadsheet, FileText } from "lucide-react-native";
import { useState } from "react";
import { Alert, View } from "react-native";
import { Button, Card, ChoiceChips, Eyebrow, palette, Screen, space, Text } from "@/design";
import { bookingErrorCode, bookingErrorMessage } from "@/features/booking/errors";
import { useGenerateReport } from "@/features/operations/api";
import { REPORT_PERIODS, reportRange, type ReportPeriod } from "@/features/operations/range";
import { currentLocale, getCopy } from "@/i18n";
import { formatDateLong, localDate } from "@/lib/time";
import type { ReportLinks } from "@/shared/database";

/** Propietario: reporte del período en PDF y CSV (Excel), con enlaces firmados de corta duración. */
export default function Reports() {
  const c = getCopy();
  const locale = currentLocale();
  const [period, setPeriod] = useState<ReportPeriod>("last7");
  const [links, setLinks] = useState<ReportLinks | null>(null);
  const generate = useGenerateReport();
  const range = reportRange(period, localDate());
  // Mediodía en Managua (18:00 UTC) para mostrar el día sin corrimientos de zona horaria.
  const pretty = (ymd: string) => formatDateLong(`${ymd}T18:00:00Z`, locale);

  return (
    <Screen edges={["top"]}>
      <View style={{ gap: space.sm }}>
        <Eyebrow>{c.owner.eyebrow}</Eyebrow>
        <Text variant="displayLg">{c.reports.title}</Text>
      </View>
      <Card>
        <Text tone="muted">{c.reports.body}</Text>
        <ChoiceChips
          label={c.reports.title}
          value={period}
          onChange={(p) => {
            setPeriod(p);
            setLinks(null);
          }}
          options={REPORT_PERIODS.map((p) => ({ value: p, label: c.reports.periods[p] }))}
        />
        <Text>{c.reports.period(pretty(range.from), pretty(range.to))}</Text>
        <Button
          label={c.reports.generate}
          loading={generate.isPending}
          testID="report-generate"
          onPress={() =>
            generate.mutate(
              { ...range, locale },
              {
                onSuccess: setLinks,
                onError: (e) => Alert.alert(bookingErrorCode(e) === "generic" ? c.reports.failed : bookingErrorMessage(e, c)),
              },
            )
          }
        />
      </Card>
      {links ? (
        <Card>
          <Button variant="ghost" label={c.reports.pdf} onPress={() => Linking.openURL(links.pdf_url)} />
          <Button variant="ghost" label={c.reports.excel} onPress={() => Linking.openURL(links.csv_url)} />
          <View style={{ flexDirection: "row", gap: space.sm, alignItems: "center" }}>
            <FileText size={16} color={palette.steel} />
            <FileSpreadsheet size={16} color={palette.steel} />
            <Text variant="bodySm" tone="muted" style={{ flex: 1 }}>
              {c.reports.expires}
            </Text>
          </View>
        </Card>
      ) : null}
    </Screen>
  );
}
