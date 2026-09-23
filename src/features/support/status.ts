import { CheckCheck, CircleDot, Inbox, Lock, type LucideIcon } from "lucide-react-native";
import type { BadgeTone } from "@/design";
import type { TicketStatus } from "@/shared/database";

export const TICKET_STATUS_STYLE: Record<TicketStatus, { tone: BadgeTone; icon: LucideIcon }> = {
  open: { tone: "info", icon: Inbox },
  in_review: { tone: "warning", icon: CircleDot },
  resolved: { tone: "success", icon: CheckCheck },
  closed: { tone: "neutral", icon: Lock },
};
