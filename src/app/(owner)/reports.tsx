import * as Linking from "expo-linking";
import { Stack } from "expo-router";
import { Clock, FileSpreadsheet } from "lucide-react-native";
import { useState } from "react";
import { View } from "react-native";
import { Button, Card, ChoiceChips, Eyebrow, palette, Screen, space, status, StatusBadge, Text } from "@/design";
import { bookingErrorCode, bookingErrorMessage } from "@/features/booking/errors";
import { useGenerateReport } from "@/features/operations/api";
import { REPORT_PERIODS, reportRange, type ReportPeriod } from "@/features/operations/range";
import { currentLocale, getCopy } from "@/i18n";
import { localDate } from "@/lib/time";
import { useNow } from "@/lib/use-now";
import type { ReportLinks } from "@/shared/database";

/**
 * Propietario · Reportes (A04/E03/E05): estadísticas y exportaciones del período. Libro Excel (XLSX con formato),
 * PDF y CSV de datos. Los enlaces son firmados y vencen pronto: al vencer, se ofrece generarlos de nuevo.
 */
export default function Reports() {
  const c = getCopy();
  const locale = currentLocale();
  const now = useNow();
  const [period, setPeriod] = useState<ReportPeriod>("last7");
  const [links, setLinks] = useState<(ReportLinks & { at: number }) | null>(null);
  // El error se muestra en la pantalla (Alert no aparece en la versión web).
  const [error, setError] = useState<string | null>(null);
  const generate = useGenerateReport();
  const range = reportRange(period, localDate());
  // Día/mes/año, igual que en el PDF y el Excel.
  const pretty = (ymd: string) => ymd.split("-").reverse().join("/");
  const expired = links !== null && now >= links.at + links.expires_in * 1000;

  function run() {
    setError(null);
    generate.mutate(
      { ...range, locale },
      {
        onSuccess: (l) => setLinks({ ...l, at: Date.now() }),
        onError: (e) => setError(bookingErrorCode(e) === "generic" ? c.reports.failed : bookingErrorMessage(e, c)),
      },
    );
  }

  return (
    <Screen edges={["top"]}>
      <Stack.Screen options={{ title: c.reports.title }} />
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
        <Button label={c.reports.generate} loading={generate.isPending} testID="report-generate" onPress={run} />
        {error ? (
          <Text variant="bodySm" style={{ color: status.danger }} accessibilityRole="alert" testID="report-error">
            {error}
          </Text>
        ) : null}
      </Card>
      {links ? (
        <Card>
          {expired ? (
            <>
              <StatusBadge label={c.reports.expired} tone="warning" icon={Clock} />
              <Button label={c.reports.regenerate} onPress={run} loading={generate.isPending} />
            </>
          ) : (
            <>
              {links.xlsx_url ? <Button label={c.reports.xlsx} onPress={() => Linking.openURL(links.xlsx_url!)} testID="report-xlsx" /> : null}
              <Button variant="ghost" label={c.reports.pdf} onPress={() => Linking.openURL(links.pdf_url)} />
              <Button variant="quiet" label={c.reports.csv} onPress={() => Linking.openURL(links.csv_url)} />
              <View style={{ flexDirection: "row", gap: space.sm, alignItems: "center" }}>
                <FileSpreadsheet size={16} color={palette.steel} />
                <Text variant="bodySm" tone="muted" style={{ flex: 1 }}>
                  {c.reports.expiresIn(Math.max(1, Math.ceil((links.at + links.expires_in * 1000 - now) / 60_000)))}
                </Text>
              </View>
            </>
          )}
        </Card>
      ) : null}
    </Screen>
  );
}
