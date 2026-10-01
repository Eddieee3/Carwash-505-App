import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Crypto from "expo-crypto";
import { db } from "@/api/supabase";
import { signedUrls, uploadEvidence } from "@/features/evidence/api";
import { ticketMediaPath } from "@/features/evidence/paths";
import type { SupportTicketRow, TicketEvent, TicketStatus } from "@/shared/database";
import type { TicketInput } from "./schema";

export type TicketBooking = {
  id: string;
  reference_code: string;
  starts_at: string;
  status: string;
  vehicle: { make: string | null; model: string | null; plate: string | null } | null;
  service: { name_es: string; name_en: string } | null;
  assigned: { full_name: string | null } | null;
};

export type Ticket = SupportTicketRow & {
  media: { storage_path: string }[];
  customer?: { full_name: string | null; email: string | null } | null;
  /** S02: reserva relacionada (vehículo, servicio y responsable). */
  booking?: TicketBooking | null;
};

const BOOKING_EMBED =
  "booking:bookings(id, reference_code, starts_at, status, vehicle:vehicles(make, model, plate), service:services(name_es, name_en), assigned:profiles!bookings_assigned_staff_id_fkey(full_name))";

/** Primeros 8 caracteres del id: identificador corto para conversar sobre la incidencia. */
export const ticketShortId = (id: string) => id.slice(0, 8).toUpperCase();

/** Cliente: sus reportes (RLS). */
export function useMyTickets() {
  return useQuery({
    queryKey: ["tickets", "mine"],
    queryFn: async () => {
      const { data, error } = await db()
        .from("support_tickets")
        .select(`*, media:ticket_media(storage_path), ${BOOKING_EMBED}`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Ticket[];
    },
  });
}

/** Cliente: crea el reporte y luego sube las fotos (ya comprimidas) a tickets/<id>/. */
export function useCreateTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ input, photos }: { input: TicketInput; photos: string[] }) => {
      const { data, error } = await db()
        .from("support_tickets")
        .insert({ booking_id: input.bookingId, kind: input.kind, description: input.description })
        .select("id")
        .single();
      if (error) throw error;
      const ticketId = (data as { id: string }).id;
      for (const uri of photos) {
        const path = ticketMediaPath(ticketId, Crypto.randomUUID());
        await uploadEvidence(path, uri);
        const { error: mediaError } = await db().from("ticket_media").insert({ ticket_id: ticketId, storage_path: path });
        if (mediaError) throw mediaError;
      }
      return ticketId;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tickets"] }),
  });
}

export type TicketFilter = "pending" | "in_review" | "resolved";
const FILTER_STATUSES: Record<TicketFilter, TicketStatus[]> = {
  pending: ["open"],
  in_review: ["in_review"],
  resolved: ["resolved", "closed"],
};

/** Propietario (Soporte): incidencias por estado, con cliente, fotos y la reserva relacionada. */
export function useTickets(filter: TicketFilter) {
  return useQuery({
    queryKey: ["tickets", "owner", filter],
    queryFn: async () => {
      const { data, error } = await db()
        .from("support_tickets")
        .select(`*, media:ticket_media(storage_path), customer:customers(full_name, email), ${BOOKING_EMBED}`)
        .in("status", FILTER_STATUSES[filter])
        .order("created_at", { ascending: filter !== "resolved" })
        .limit(50);
      if (error) throw error;
      return data as Ticket[];
    },
  });
}

/** Cambia el estado y, si se escribe, la respuesta del negocio (queda en el historial con autor y fecha). */
export function useUpdateTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, resolution }: { id: string; status: TicketStatus; resolution?: string }) => {
      const patch = resolution?.trim() ? { status, resolution: resolution.trim().slice(0, 2000) } : { status };
      const { error } = await db().from("support_tickets").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tickets"] }),
  });
}

/** S01: historial de la incidencia (estados y respuestas). */
export function useTicketEvents(ticketId: string | null) {
  return useQuery({
    queryKey: ["ticket-events", ticketId],
    enabled: !!ticketId,
    queryFn: async () => {
      const { data, error } = await db().from("ticket_events").select("*").eq("ticket_id", ticketId).order("created_at");
      if (error) throw error;
      return data as TicketEvent[];
    },
  });
}

export function useSignedUrls(paths: string[]) {
  return useQuery({
    queryKey: ["signed", ...paths],
    queryFn: () => signedUrls(paths),
    enabled: paths.length > 0,
    staleTime: 30 * 60_000,
  });
}
