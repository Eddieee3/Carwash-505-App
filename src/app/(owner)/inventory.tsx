import { View } from "react-native";
import { Eyebrow, Screen, space, Text } from "@/design";
import { InventorySection } from "@/features/operations/OperationsScreen";
import { getCopy } from "@/i18n";

/** Propietario · Inventario (A03): insumos, alertas de mínimo, compras, consumos y ajustes. */
export default function OwnerInventory() {
  const c = getCopy();
  return (
    <Screen edges={["top"]}>
      <View style={{ gap: space.sm }}>
        <Eyebrow>{c.owner.eyebrow}</Eyebrow>
        <Text variant="displayLg">{c.owner.tabs.inventory}</Text>
      </View>
      <InventorySection owner />
    </Screen>
  );
}
