import { Platform, Alert as NativeAlert, type AlertButton } from "react-native";

type WebDialogs = { alert: (message: string) => void; confirm: (message: string) => boolean };

/**
 * Misma firma que Alert.alert de React Native. En iOS/Android usa el diálogo nativo. En web, Alert.alert de
 * react-native-web no hace nada (los botones con confirmación quedaban sin respuesta: Cancelar, No asistió…),
 * así que se usa window.confirm / window.alert y se ejecuta la acción elegida.
 */
export function showAlert(title: string, message?: string, buttons?: AlertButton[], web?: WebDialogs): void {
  if (Platform.OS !== "web" && !web) {
    NativeAlert.alert(title, message, buttons);
    return;
  }
  const dialogs: WebDialogs | undefined = web ?? (typeof window !== "undefined" ? window : undefined);
  const text = message ? `${title}\n\n${message}` : title;
  const cancel = buttons?.find((b) => b.style === "cancel");
  const action = buttons?.find((b) => b.style !== "cancel");
  if (!action) {
    dialogs?.alert(text);
    cancel?.onPress?.();
    return;
  }
  if (dialogs?.confirm(text)) action.onPress?.();
  else cancel?.onPress?.();
}

export const Alert = { alert: showAlert };
