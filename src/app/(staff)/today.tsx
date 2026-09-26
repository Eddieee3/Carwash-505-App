import { useAuth } from "@/features/auth/AuthProvider";
import { BoardScreen } from "@/features/board/BoardScreen";
import { getCopy } from "@/i18n";

/** Personal del local: tablero de hoy. El admin del lobby además escanea y cobra desde aquí. */
export default function StaffToday() {
  const c = getCopy();
  const { view } = useAuth();
  return <BoardScreen eyebrow={view === "lobby" ? c.staff.eyebrowLobby : c.staff.eyebrow} withSignOut />;
}
