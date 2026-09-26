import * as Linking from "expo-linking";
import { FileSpreadsheet, FileText } from "lucide-react-native";
import { useState } from "react";
import { View } from "react-native";
import { Button, Card, ChoiceChips, Eyebrow, palette, Screen, space, status, Text } from "@/design";
import { bookingErrorCode, bookingErrorMessage } from "@/features/booking/errors";
import { useGenerateReport } from "@/features/operations/api";
import { REPORT_PERIODS, reportRange, type ReportPeriod } from "@/features/operations/range";
import { currentLocale, getCopy } from "@/i18n";
import { localDate } from "@/lib/time";
import type { ReportLinks } from "@/shared/database";

/** Propietario: reporte del período en PDF y CSV (Excel), con enlaces firmados de corta duración. */
export default function Reports() {
  const c = getCopy();
  const locale = currentLocale();
  const [period, setPeriod] = useState<ReportPeriod>("last7");
  const [links, setLinks] = useState<ReportLinks | null>(null);
  // El error se muestra en la pantalla (Alert no aparece en la versión web).
  const [error, setError] = useState<string | null>(null);
  const generate = useGenerateReport();
  const range = reportRange(period, localDate());
  // Día/mes/año, igual que en el PDF y el Excel.
  const pretty = (ymd: string) => ymd.split("-").reverse().join("/");

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
            setError(null);
          }}
          options={REPORT_PERIODS.map((p) => ({ value: p, label: c.reports.periods[p] }))}
        />
        <Text>{c.reports.period(pretty(range.from), pretty(range.to))}</Text>
        <Button
          label={c.reports.generate}
          loading={generate.isPending}
          testID="report-generate"
          onPress={() => {
            setError(null);
            generate.mutate(
              { ...range, locale },
              {
                onSuccess: setLinks,
                onError: (e) => setError(bookingErrorCode(e) === "generic" ? c.reports.failed : bookingErrorMessage(e, c)),
              },
            );
          }}
        />
        {error ? (
          <Text variant="bodySm" style={{ color: status.danger }} accessibilityRole="alert" testID="report-error">
            {error}
          </Text>
        ) : null}
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
