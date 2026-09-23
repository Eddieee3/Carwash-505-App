import { BoardScreen } from "@/features/board/BoardScreen";
import { getCopy } from "@/i18n";

export default function OwnerBoard() {
  return <BoardScreen eyebrow={getCopy().owner.eyebrow} />;
}
