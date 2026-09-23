import { Ban, CheckCheck, CircleCheck, CircleDot, Clock, UserX, type LucideIcon } from "lucide-react-native";
import type { BadgeTone } from "@/design";
import type { BookingStatus } from "@/shared/database";

/** Cada estado con color + ícono + texto (nunca solo color). */
export const STATUS_STYLE: Record<BookingStatus, { tone: BadgeTone; icon: LucideIcon }> = {
  confirmed: { tone: "info", icon: CircleCheck },
  checked_in: { tone: "warning", icon: CircleDot },
  in_progress: { tone: "warning", icon: Clock },
  completed: { tone: "success", icon: CheckCheck },
  cancelled: { tone: "neutral", icon: Ban },
  no_show: { tone: "danger", icon: UserX },
};
