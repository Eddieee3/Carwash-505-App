import * as Linking from "expo-linking";
import { Settings } from "lucide-react-native";
import { EmptyState, Screen } from "@/design";
import { getCopy } from "@/i18n";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

/** Igual que la web sin Supabase: se explica el estado y se ofrece WhatsApp, sin perder a nadie en silencio. */
export default function Setup() {
  const c = getCopy();
  return (
    <Screen>
      <EmptyState
        icon={Settings}
        title={c.setup.title}
        body={c.setup.body}
        action={{ label: c.common.whatsapp, onPress: () => Linking.openURL(buildWhatsAppUrl()) }}
      />
    </Screen>
  );
}
