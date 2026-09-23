import { BoardScreen } from "@/features/board/BoardScreen";
import { getCopy } from "@/i18n";

export default function StaffToday() {
  return <BoardScreen eyebrow={getCopy().staff.eyebrow} withSignOut />;
}
