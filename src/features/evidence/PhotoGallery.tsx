import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";
import { radius, space, Text, useTheme } from "@/design";

export type GalleryPhoto = { id: string; url: string; label?: string };

/** Miniaturas de fotos privadas (URLs firmadas). */
export function PhotoGallery({ photos, emptyText }: { photos: GalleryPhoto[]; emptyText?: string }) {
  const theme = useTheme();
  if (photos.length === 0) return emptyText ? <Text tone="muted">{emptyText}</Text> : null;
  return (
    <View style={styles.grid}>
      {photos.map((p) => (
        <View key={p.id} style={styles.item}>
          <Image
            source={{ uri: p.url }}
            style={[styles.thumb, { borderColor: theme.line }]}
            contentFit="cover"
            accessibilityLabel={p.label}
          />
          {p.label ? (
            <Text variant="bodySm" tone="muted">
              {p.label}
            </Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  item: { gap: space.xs },
  thumb: { width: 96, height: 96, borderRadius: radius.control, borderWidth: 1 },
});
