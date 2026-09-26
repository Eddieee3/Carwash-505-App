import { useQueryClient } from "@tanstack/react-query";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { router, type Href } from "expo-router";
import { useCallback, useEffect, useRef } from "react";
import { Platform } from "react-native";
import { db } from "@/api/supabase";
import { getCopy } from "@/i18n";
import { intentFromResponse, REMINDER_CATEGORY } from "./actions";

// Con la app abierta también se muestran los avisos.
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

let currentToken: string | null = null;

// En web (vista previa) no existe la API nativa de respuestas; Platform.OS es constante, así que el hook es estable.
const IS_WEB = Platform.OS === "web";
const useLastResponse = IS_WEB ? () => null : Notifications.useLastNotificationResponse;

async function configure() {
  const c = getCopy();
  await Notifications.setNotificationCategoryAsync(REMINDER_CATEGORY, [
    { identifier: "attending", buttonTitle: c.push.attending, options: { opensAppToForeground: false } },
    { identifier: "late", buttonTitle: c.push.late, options: { opensAppToForeground: false } },
    { identifier: "cancel", buttonTitle: c.push.cancel, options: { opensAppToForeground: false, isDestructive: true } },
  ]);
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("reminders", { name: c.push.channelReminders, importance: Notifications.AndroidImportance.HIGH });
    await Notifications.setNotificationChannelAsync("default", { name: c.push.channelDefault, importance: Notifications.AndroidImportance.DEFAULT });
    // Canal propio para promociones: el cliente puede silenciarlo sin perder los recordatorios.
    await Notifications.setNotificationChannelAsync("marketing", { name: c.push.channelMarketing, importance: Notifications.AndroidImportance.LOW });
  }
}

/**
 * Pide permiso y registra el dispositivo. Devuelve null (sin error) si no aplica: web, simulador,
 * permiso negado o proyecto sin `projectId` de EAS (necesario para Expo Push).
 */
async function registerPushToken(): Promise<string | null> {
  if (Platform.OS === "web" || !Device.isDevice) return null;
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) return null;
  let { status } = await Notifications.getPermissionsAsync();
  if (status !== "granted") ({ status } = await Notifications.requestPermissionsAsync());
  if (status !== "granted") return null;
  const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
  const { error } = await db().rpc("register_push_token", { p_token: data, p_platform: Platform.OS });
  if (error) throw error;
  currentToken = data;
  return data;
}

/** Al cerrar sesión el dispositivo deja de recibir avisos de esa cuenta. */
export async function unregisterPushToken() {
  if (!currentToken) return;
  await db().rpc("unregister_push_token", { p_token: currentToken });
  currentToken = null;
}

/** Registra el dispositivo y atiende los botones "Asistiré / Llegaré tarde / Cancelar" del recordatorio. */
export function usePushNotifications(enabled: boolean) {
  const qc = useQueryClient();
  const last = useLastResponse();
  const handled = useRef<string | null>(null);

  const handle = useCallback(
    async (response: Notifications.NotificationResponse) => {
      const key = `${response.notification.request.identifier}:${response.actionIdentifier}`;
      if (handled.current === key) return;
      handled.current = key;
      const intent = intentFromResponse(response.actionIdentifier, response.notification.request.content.data);
      if (!intent) return;
      if (intent.type === "reply") {
        await db().rpc("reply_attendance", { p_booking_id: intent.bookingId, p_reply: intent.reply });
        qc.invalidateQueries({ queryKey: ["my-bookings"] });
      } else {
        router.push(intent.url as Href);
      }
    },
    [qc],
  );

  useEffect(() => {
    if (!enabled || IS_WEB) return;
    configure()
      .then(registerPushToken)
      .catch(() => undefined); // sin push la app sigue funcionando (el cliente ve todo en la app)
  }, [enabled]);

  useEffect(() => {
    if (!enabled || IS_WEB) return;
    const sub = Notifications.addNotificationResponseReceivedListener((r) => void handle(r));
    return () => sub.remove();
  }, [enabled, handle]);

  useEffect(() => {
    if (enabled && last) void handle(last);
  }, [enabled, last, handle]);
}
