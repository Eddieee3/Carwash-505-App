import { Ban, CarFront, CheckCheck, CircleCheck, CircleDot, Clock, ShieldCheck, UserX, type LucideIcon } from "lucide-react-native";
import type { BadgeTone } from "@/design";
import type { BookingStatus } from "@/shared/database";

/** Cada estado con color + ícono + texto (nunca solo color). */
export const STATUS_STYLE: Record<BookingStatus, { tone: BadgeTone; icon: LucideIcon }> = {
  confirmed: { tone: "info", icon: CircleCheck },
  checked_in: { tone: "warning", icon: CircleDot },
  in_progress: { tone: "warning", icon: Clock },
  quality_check: { tone: "info", icon: ShieldCheck },
  ready: { tone: "success", icon: CarFront },
  completed: { tone: "success", icon: CheckCheck },
  cancelled: { tone: "neutral", icon: Ban },
  no_show: { tone: "danger", icon: UserX },
};
