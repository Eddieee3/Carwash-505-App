import { Image } from "expo-image";
import * as Linking from "expo-linking";
import { ImageOff, Search } from "lucide-react-native";
import { useState } from "react";
import { StyleSheet, TextInput, useWindowDimensions, View } from "react-native";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";
import { Button, Card, ChoiceChips, EmptyState, Eyebrow, fonts, palette, radius, Screen, space, status, Text, touch, useTheme } from "@/design";
import { Sheet } from "@/features/board/sheets";
import { filterProducts, PRODUCT_CATEGORIES, PRODUCTS, type Product, type ProductCategory } from "@/features/products/catalog";
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

/**
 * Productos a la venta en el local (P01–P06): búsqueda por nombre o marca combinada con las categorías, tarjetas
 * simples con foto normalizada y una ficha propia por producto. Solo información de la etiqueta (verificada); precio y
 * disponibilidad se consultan por WhatsApp con el producto ya escrito en el mensaje.
 */
export default function Products() {
  const c = getCopy();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const [category, setCategory] = useState<ProductCategory | "all">("all");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<Product | null>(null);
  const columns = width >= 1100 ? 4 : width >= 760 ? 3 : 2;
  const list = filterProducts(PRODUCTS, category, query);

  return (
    <Screen edges={["top"]}>
      <View style={styles.page}>
        <View style={{ gap: space.sm }}>
          <Eyebrow>{c.products.eyebrow}</Eyebrow>
          <Text variant="displayLg" accessibilityRole="header">
            {c.products.title}
          </Text>
          <Text tone="muted">{c.products.intro}</Text>
        </View>

        <View style={[styles.search, { borderColor: theme.lineStrong, backgroundColor: theme.bgRaised }]}>
          <Search size={18} color={theme.fgMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={c.products.searchPlaceholder}
            placeholderTextColor={theme.fgMuted}
            accessibilityLabel={c.products.search}
            style={[styles.searchInput, { color: theme.fg }]}
            autoCorrect={false}
            returnKeyType="search"
            testID="products-search"
          />
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

        {list.length === 0 ? (
          <EmptyState
            icon={Search}
            title={c.products.noResults}
            action={{
              label: c.products.clearFilters,
              onPress: () => {
                setQuery("");
                setCategory("all");
              },
            }}
          />
        ) : (
          <View style={styles.grid}>
            {list.map((p) => (
              <View key={p.id} style={{ width: `${100 / columns}%`, padding: space.xs }}>
                <ProductCard product={p} onOpen={() => setOpen(p)} />
              </View>
            ))}
          </View>
        )}
      </View>

      <Sheet visible={!!open} title={open ? `${open.brand} ${open.name}` : ""} onClose={() => setOpen(null)}>
        {open ? <ProductDetail product={open} /> : null}
      </Sheet>
    </Screen>
  );
}

/** Foto en un contenedor cuadrado igual para todos (contain, centrada) y un sustituto claro si no carga. */
function ProductPhoto({ product, height }: { product: Product; height: number }) {
  const c = getCopy();
  const theme = useTheme();
  const [failed, setFailed] = useState(false);
  const color = HALO[product.category];
  return (
    <View style={[styles.stage, { height }]}>
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id={`halo-${product.id}-${height}`} cx="50%" cy="55%" r="55%">
            <Stop offset="0" stopColor={color} stopOpacity={0.4} />
            <Stop offset="0.6" stopColor={color} stopOpacity={0.1} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#halo-${product.id}-${height})`} />
      </Svg>
      {failed ? (
        <View style={{ alignItems: "center", gap: space.xs }}>
          <ImageOff size={32} color={theme.fgMuted} />
          <Text variant="bodySm" tone="muted">
            {c.products.photoPending}
          </Text>
        </View>
      ) : (
        <Image
          source={product.image}
          style={styles.image}
          contentFit="contain"
          contentPosition="center"
          onError={() => setFailed(true)}
          accessibilityLabel={c.products.photoAlt(`${product.brand} ${product.name}`)}
        />
      )}
    </View>
  );
}

function ProductCard({ product, onOpen }: { product: Product; onOpen: () => void }) {
  const c = getCopy();
  const title = `${product.brand} ${product.name}`;
  return (
    <Card style={styles.card}>
      <ProductPhoto product={product} height={150} />
      <View style={{ gap: 2 }}>
        <Text variant="eyebrow" tone="accent">
          {product.brand}
        </Text>
        <Text variant="label">{product.name}</Text>
        <Text variant="bodySm" tone="muted" numberOfLines={2}>
          {product.description}
        </Text>
      </View>
      <View style={styles.action}>
        <Button
          variant="ghost"
          label={c.products.view}
          onPress={onOpen}
          accessibilityLabel={`${c.products.view}: ${title}`}
          testID={`product-view-${product.id}`}
        />
      </View>
    </Card>
  );
}

/** P01/P05/P06: ficha con lo que dice la etiqueta. Lo no confirmado (precio, rendimiento) se consulta. */
function ProductDetail({ product }: { product: Product }) {
  const c = getCopy();
  const title = `${product.brand} ${product.name}`;
  return (
    <>
      <ProductPhoto product={product} height={240} />
      <Text variant="eyebrow" tone="accent">
        {product.brand}
      </Text>
      <Text variant="displaySm">{product.name}</Text>
      <Text tone="muted">{c.products.categories[product.category]}</Text>
      <Text>{product.description}</Text>
      {product.variants.length > 0 ? (
        <View style={{ gap: 2 }}>
          <Text variant="label">{product.category === "fragrance" ? c.products.variants(product.variants.length) : c.products.presentations}</Text>
          <Text tone="muted">{product.variants.join(" · ")}</Text>
        </View>
      ) : null}
      <Text variant="bodySm" tone="muted">
        {c.products.consultNote}
      </Text>
      <Button
        label={c.products.consult}
        onPress={() => Linking.openURL(buildWhatsAppUrl(c.products.whatsappMessage(title)))}
        testID={`product-consult-${product.id}`}
      />
    </>
  );
}

const styles = StyleSheet.create({
  page: { width: "100%", maxWidth: 1120, alignSelf: "center", gap: space.xl },
  grid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -space.xs },
  card: { flex: 1, padding: space.md, gap: space.sm },
  stage: { width: "100%", alignItems: "center", justifyContent: "center", borderRadius: radius.control, overflow: "hidden" },
  image: { width: "86%", height: "90%" },
  action: { marginTop: "auto" },
  search: {
    minHeight: touch.min,
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    borderWidth: 1,
    borderRadius: radius.control,
    paddingHorizontal: space.md,
  },
  searchInput: { flex: 1, minHeight: touch.min, fontFamily: fonts.sans.regular, fontSize: 16 },
});
