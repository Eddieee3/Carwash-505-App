import type { MediaPhase } from "@/shared/database";

/** Bucket privado de Supabase (migración 9). Las rutas deben cumplir los mismos CHECK que la BD. */
export const EVIDENCE_BUCKET = "service-evidence";
const FILE_ID = /^[A-Za-z0-9_-]{1,64}$/;

function assertFileId(fileId: string) {
  if (!FILE_ID.test(fileId)) throw new Error("invalid_file_id");
}

export function bookingMediaPath(bookingId: string, phase: MediaPhase, fileId: string): string {
  assertFileId(fileId);
  return `bookings/${bookingId}/${phase}/${fileId}.jpg`;
}

export function ticketMediaPath(ticketId: string, fileId: string): string {
  assertFileId(fileId);
  return `tickets/${ticketId}/${fileId}.jpg`;
}
