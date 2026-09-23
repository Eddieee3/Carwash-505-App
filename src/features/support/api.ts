import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Crypto from "expo-crypto";
import { db } from "@/api/supabase";
import { signedUrls, uploadEvidence } from "@/features/evidence/api";
import { ticketMediaPath } from "@/features/evidence/paths";
import type { SupportTicketRow, TicketStatus } from "@/shared/database";
import type { TicketInput } from "./schema";

export type Ticket = SupportTicketRow & {
  media: { storage_path: string }[];
  customer?: { full_name: string | null; email: string | null } | null;
};

/** Cliente: sus reportes (RLS). */
export function useMyTickets() {
  return useQuery({
    queryKey: ["tickets", "mine"],
    queryFn: async () => {
      const { data, error } = await db().from("support_tickets").select("*, media:ticket_media(storage_path)").order("created_at", { ascending: false });
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

/** Propietario: reportes abiertos o en revisión. */
export function useOpenTickets() {
  return useQuery({
    queryKey: ["tickets", "open"],
    queryFn: async () => {
      const { data, error } = await db()
        .from("support_tickets")
        .select("*, media:ticket_media(storage_path), customer:customers(full_name, email)")
        .in("status", ["open", "in_review"])
        .order("created_at");
      if (error) throw error;
      return data as Ticket[];
    },
  });
}

export function useUpdateTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: TicketStatus }) => {
      const { error } = await db().from("support_tickets").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tickets"] }),
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
