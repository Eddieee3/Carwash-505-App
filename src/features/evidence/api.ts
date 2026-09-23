import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Crypto from "expo-crypto";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { db } from "@/api/supabase";
import type { MediaPhase } from "@/shared/database";
import { bookingMediaPath, EVIDENCE_BUCKET } from "./paths";

export type PhotoSource = "camera" | "library";
const MAX_SIDE = 1600;

/**
 * Toma o elige una foto y la re-codifica a JPEG (máx. 1600 px, calidad 0,8).
 * Al re-codificar se descartan los metadatos EXIF, incluida la ubicación. null = la persona canceló.
 */
export async function capturePhoto(source: PhotoSource): Promise<string | null> {
  const permission =
    source === "camera" ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) throw new Error("permission_denied");
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], quality: 1, exif: false };
  const result = source === "camera" ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  const asset = result.canceled ? null : result.assets[0];
  if (!asset) return null;

  const context = ImageManipulator.manipulate(asset.uri);
  if (asset.width > MAX_SIDE || asset.height > MAX_SIDE) {
    context.resize(asset.width >= asset.height ? { width: MAX_SIDE } : { height: MAX_SIDE });
  }
  const image = await context.renderAsync();
  const saved = await image.saveAsync({ compress: 0.8, format: SaveFormat.JPEG });
  return saved.uri;
}

export async function uploadEvidence(path: string, uri: string) {
  const body = await (await fetch(uri)).arrayBuffer();
  const { error } = await db().storage.from(EVIDENCE_BUCKET).upload(path, body, { contentType: "image/jpeg", upsert: false });
  if (error) throw error;
}

export async function signedUrls(paths: string[]): Promise<Record<string, string>> {
  if (paths.length === 0) return {};
  const { data, error } = await db().storage.from(EVIDENCE_BUCKET).createSignedUrls(paths, 60 * 60);
  if (error) throw error;
  const entries: [string, string][] = [];
  for (const d of data) if (d.path && d.signedUrl) entries.push([d.path, d.signedUrl]);
  return Object.fromEntries(entries);
}

/** Personal: foto antes / después / daño de una reserva. */
export function useUploadBookingPhoto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ bookingId, phase, source }: { bookingId: string; phase: MediaPhase; source: PhotoSource }) => {
      const uri = await capturePhoto(source);
      if (!uri) return false;
      const path = bookingMediaPath(bookingId, phase, Crypto.randomUUID());
      await uploadEvidence(path, uri);
      const { error } = await db().from("booking_media").insert({ booking_id: bookingId, phase, storage_path: path });
      if (error) {
        await db().storage.from(EVIDENCE_BUCKET).remove([path]); // no dejar archivos huérfanos
        throw error;
      }
      return true;
    },
    onSuccess: (_ok, { bookingId }) => {
      qc.invalidateQueries({ queryKey: ["board"] });
      qc.invalidateQueries({ queryKey: ["booking-media", bookingId] });
    },
  });
}

export type BookingPhoto = { id: string; phase: MediaPhase; url: string };

/** Fotos de una reserva con URLs firmadas de 1 hora (el bucket es privado). */
export function useBookingMedia(bookingId: string) {
  return useQuery({
    queryKey: ["booking-media", bookingId],
    queryFn: async () => {
      const { data, error } = await db()
        .from("booking_media")
        .select("id, phase, storage_path")
        .eq("booking_id", bookingId)
        .order("created_at");
      if (error) throw error;
      const rows = data as { id: string; phase: MediaPhase; storage_path: string }[];
      const urls = await signedUrls(rows.map((r) => r.storage_path));
      return rows.filter((r) => urls[r.storage_path]).map((r) => ({ id: r.id, phase: r.phase, url: urls[r.storage_path] }));
    },
    staleTime: 30 * 60_000,
  });
}
