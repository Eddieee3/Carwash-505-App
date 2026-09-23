import * as Linking from "expo-linking";
import { ShieldAlert } from "lucide-react-native";
import { Button, EmptyState, Screen } from "@/design";
import { useAuth } from "@/features/auth/AuthProvider";
import { getCopy } from "@/i18n";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

export default function NoAccess() {
  const c = getCopy();
  const { role, signOut, retryRole } = useAuth();

  const content =
    role === "panel_only"
      ? { title: c.blocked.panelTitle, body: c.blocked.panelBody, action: undefined }
      : role === "disabled"
        ? {
            title: c.blocked.disabledTitle,
            body: c.blocked.disabledBody,
            action: { label: c.common.whatsapp, onPress: () => Linking.openURL(buildWhatsAppUrl()) },
          }
        : { title: c.blocked.errorTitle, body: c.blocked.errorBody, action: { label: c.common.retry, onPress: retryRole } };

  return (
    <Screen>
      <EmptyState icon={ShieldAlert} {...content} />
      <Button variant="quiet" label={c.common.signOut} onPress={signOut} />
    </Screen>
  );
}
