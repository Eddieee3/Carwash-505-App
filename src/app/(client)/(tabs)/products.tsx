import { Image } from "expo-image";
import * as Linking from "expo-linking";
import { useState } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";
import { Button, Card, ChoiceChips, Eyebrow, palette, Screen, space, status, Text } from "@/design";
import { PRODUCT_CATEGORIES, PRODUCTS, type Product, type ProductCategory } from "@/features/products/catalog";
import { getCopy } from "@/i18n";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

/** Halo detrás del producto, por categoría: nunca blanco ni negro. */
const HALO: Record<ProductCategory, string> = {
  fragrance: palette.cyan,
  exterior: palette.brand,
  interior: status.success,
  ceramic: palette.signal,
  safety: status.danger,
};

/** Productos a la venta en el local: tarjetas de vidrio con la foto recortada sobre un halo de color. */
export default function Products() {
  const c = getCopy();
  const { width } = useWindowDimensions();
  const [category, setCategory] = useState<ProductCategory | "all">("all");
  const columns = width >= 1100 ? 4 : width >= 760 ? 3 : 2;
  const list = category === "all" ? PRODUCTS : PRODUCTS.filter((p) => p.category === category);

  return (
    <Screen edges={["top"]}>
      <View style={styles.page}>
        <View style={{ gap: space.sm }}>
          <Eyebrow>{c.products.eyebrow}</Eyebrow>
          <Text variant="displayLg">{c.products.title}</Text>
          <Text tone="muted">{c.products.intro}</Text>
        </View>

        <ChoiceChips
          label={c.products.title}
          value={category}
          onChange={setCategory}
          options={[
            { value: "all" as const, label: c.products.all },
            ...PRODUCT_CATEGORIES.map((k) => ({ value: k, label: c.products.categories[k] })),
          ]}
          testIDPrefix="products-category"
        />

        <View style={styles.grid}>
          {list.map((p) => (
            <View key={p.id} style={{ width: `${100 / columns}%`, padding: space.xs }}>
              <ProductCard product={p} />
            </View>
          ))}
        </View>
      </View>
    </Screen>
  );
}

function ProductCard({ product }: { product: Product }) {
  const c = getCopy();
  const color = HALO[product.category];
  const title = `${product.brand} ${product.name}`;
  return (
    <Card style={styles.card} accessibilityLabel={title}>
      <View style={styles.stage}>
        <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
          <Defs>
            <RadialGradient id={`halo-${product.id}`} cx="50%" cy="55%" r="55%">
              <Stop offset="0" stopColor={color} stopOpacity={0.45} />
              <Stop offset="0.6" stopColor={color} stopOpacity={0.12} />
              <Stop offset="1" stopColor={color} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect width="100%" height="100%" fill={`url(#halo-${product.id})`} />
        </Svg>
        <Image source={product.image} style={styles.image} contentFit="contain" accessibilityIgnoresInvertColors />
      </View>

      <View style={{ gap: 2 }}>
        <Text variant="eyebrow" tone="accent" numberOfLines={1}>
          {product.brand}
        </Text>
        <Text variant="label" numberOfLines={2}>
          {product.name}
        </Text>
        <Text variant="bodySm" tone="muted" numberOfLines={3}>
          {product.description}
        </Text>
        {product.variants.length > 0 ? (
          <Text variant="bodySm" style={{ color }} numberOfLines={2}>
            {product.category === "fragrance"
              ? `${c.products.variants(product.variants.length)} · ${product.variants.join(", ")}`
              : product.variants.join(" · ")}
          </Text>
        ) : null}
      </View>

      <View style={styles.action}>
        <Button
          variant="ghost"
          label={c.products.consult}
          onPress={() => Linking.openURL(buildWhatsAppUrl(c.products.whatsappMessage(title)))}
          testID={`product-consult-${product.id}`}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  page: { width: "100%", maxWidth: 1120, alignSelf: "center", gap: space.xl },
  grid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -space.xs },
  card: { flex: 1, padding: space.md, gap: space.sm },
  stage: { height: 170, alignItems: "center", justifyContent: "center" },
  image: { width: "88%", height: "92%" },
  action: { marginTop: "auto" },
});
