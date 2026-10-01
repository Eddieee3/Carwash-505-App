import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { currentUserId, db } from "@/api/supabase";
import type { VehicleRow } from "@/shared/database";
import type { VehicleInput } from "./vehicle";

export const VEHICLES_KEY = ["vehicles"] as const;

/** Vehículos activos del cliente (RLS: solo los propios). El principal primero. */
export function useVehicles() {
  return useQuery({
    queryKey: VEHICLES_KEY,
    queryFn: async () => {
      const { data, error } = await db()
        .from("vehicles")
        .select("*")
        .is("archived_at", null)
        .order("is_default", { ascending: false })
        .order("created_at");
      if (error) throw error;
      return data as VehicleRow[];
    },
  });
}

// La BD admite un solo vehículo principal: primero se quita la marca a los demás.
async function clearDefault(exceptId?: string) {
  let query = db().from("vehicles").update({ is_default: false }).eq("is_default", true);
  if (exceptId) query = query.neq("id", exceptId);
  const { error } = await query;
  if (error) throw error;
}

export function useSaveVehicle() {
  const qc = useQueryClient();
  return useMutation({
    /** Devuelve el id del vehículo (el nuevo, al crearlo) para poder subir su foto a continuación. */
    mutationFn: async ({ id, input, isFirst }: { id?: string; input: VehicleInput; isFirst: boolean }): Promise<string> => {
      const isDefault = input.is_default || isFirst;
      if (isDefault) await clearDefault(id);
      const row = { ...input, is_default: isDefault };
      if (id) {
        const { error } = await db().from("vehicles").update(row).eq("id", id);
        if (error) throw error;
        return id;
      }
      const { data, error } = await db()
        .from("vehicles")
        .insert({ ...row, customer_id: await currentUserId() })
        .select("id")
        .single();
      if (error) throw error;
      return (data as { id: string }).id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: VEHICLES_KEY }),
  });
}

/** Nombre del cliente para el saludo del inicio (RLS: solo su propia fila). */
export function useMyCustomer() {
  return useQuery({
    queryKey: ["my-customer"],
    queryFn: async () => {
      const { data, error } = await db().from("customers").select("full_name").eq("id", await currentUserId()).maybeSingle();
      if (error) throw error;
      return (data as { full_name: string | null } | null) ?? { full_name: null };
    },
    staleTime: 10 * 60_000,
  });
}

export const VEHICLE_PHOTOS_BUCKET = "vehicle-photos";

/** Ruta privada de la foto: <cliente>/<vehículo>/<archivo>.jpg (la política del bucket exige ser el dueño). */
export function vehiclePhotoPath(customerId: string, vehicleId: string, fileId: string) {
  return `${customerId}/${vehicleId}/${fileId}.jpg`;
}

/** URL firmada (1 h) de la foto de cada vehículo que la tenga. */
export function useVehiclePhotoUrls(vehicles: Pick<VehicleRow, "id" | "photo_path">[] | undefined) {
  const paths = (vehicles ?? []).map((v) => v.photo_path).filter((p): p is string => !!p);
  return useQuery({
    queryKey: ["vehicle-photos", ...paths],
    enabled: paths.length > 0,
    queryFn: async () => {
      const { data, error } = await db().storage.from(VEHICLE_PHOTOS_BUCKET).createSignedUrls(paths, 60 * 60);
      if (error) throw error;
      const urls: Record<string, string> = {};
      for (const d of data) if (d.path && d.signedUrl) urls[d.path] = d.signedUrl;
      return urls;
    },
    staleTime: 30 * 60_000,
  });
}

/**
 * Sube la foto ya re-codificada (JPEG sin EXIF, máx. 1600 px: ver capturePhoto) y la deja como foto del vehículo.
 * Si guardar la ruta falla, borra el archivo; si todo sale bien, borra la foto anterior.
 */
export function useSetVehiclePhoto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ vehicle, uri, fileId }: { vehicle: Pick<VehicleRow, "id" | "photo_path">; uri: string; fileId: string }) => {
      const path = vehiclePhotoPath(await currentUserId(), vehicle.id, fileId);
      const body = await (await fetch(uri)).arrayBuffer();
      if (body.byteLength > 5 * 1024 * 1024) throw new Error("photo_too_large");
      const up = await db().storage.from(VEHICLE_PHOTOS_BUCKET).upload(path, body, { contentType: "image/jpeg", upsert: false });
      if (up.error) throw up.error;
      const { error } = await db().from("vehicles").update({ photo_path: path }).eq("id", vehicle.id);
      if (error) {
        await db().storage.from(VEHICLE_PHOTOS_BUCKET).remove([path]);
        throw error;
      }
      if (vehicle.photo_path) await db().storage.from(VEHICLE_PHOTOS_BUCKET).remove([vehicle.photo_path]);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: VEHICLES_KEY }),
  });
}

/** Se archiva (no se borra) para no romper el historial de reservas. */
export function useArchiveVehicle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db()
        .from("vehicles")
        .update({ archived_at: new Date().toISOString(), is_default: false })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: VEHICLES_KEY }),
  });
}
