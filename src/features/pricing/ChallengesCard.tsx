import { Target, Trophy } from "lucide-react-native";
import { StyleSheet, View } from "react-native";
import { Card, radius, space, StatusBadge, Text, useTheme } from "@/design";
import { currentLocale, getCopy } from "@/i18n";
import { formatDateLong } from "@/lib/time";
import { useEngagement } from "./api";

/** Wallet: retos vigentes con su progreso real (servicios completados). Sin retos activos, no se muestra. */
export function ChallengesCard() {
  const c = getCopy();
  const locale = currentLocale();
  const theme = useTheme();
  const engagement = useEngagement();
  const list = engagement.data?.challenges ?? [];
  if (list.length === 0) return null;

  return (
    <Card>
      <Text variant="eyebrow" tone="accent">
        {c.challenges.title}
      </Text>
      {list.map((x) => (
        <View key={x.id} style={{ gap: space.xs }}>
          <Text variant="displaySm">{locale === "en" ? x.name_en : x.name_es}</Text>
          {x.completed ? (
            <StatusBadge label={c.challenges.done} tone="success" icon={Trophy} />
          ) : (
            <>
              <View
                style={[styles.track, { backgroundColor: theme.line }]}
                accessibilityRole="progressbar"
                accessibilityValue={{ min: 0, max: x.target, now: x.progress }}
              >
                <View style={[styles.fill, { width: `${Math.round((100 * x.progress) / x.target)}%`, backgroundColor: theme.accent }]} />
              </View>
              <Text tone="muted">{`${c.challenges.progress(x.progress, x.target)} · ${c.challenges.reward(x.reward_points)}`}</Text>
            </>
          )}
          <StatusBadge label={c.challenges.until(formatDateLong(x.ends_at, locale))} icon={Target} />
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  track: { height: 8, borderRadius: radius.pill, overflow: "hidden" },
  fill: { height: 8, borderRadius: radius.pill },
});
