import { requireRole } from "@/lib/auth-helpers";
import { UserRole } from "@/types";
import { getCurrentShift, getShiftHistory } from "../actions";
import { ShiftManager } from "./shift-manager";

export default async function ShiftPage() {
  await requireRole(UserRole.OWNER, UserRole.MANAGER, UserRole.ATTENDANT);

  const [currentShift, shiftHistory] = await Promise.all([
    getCurrentShift(),
    getShiftHistory(),
  ]);

  return (
    <div className="flex min-h-screen flex-col">
      <ShiftManager
        currentShift={currentShift}
        shiftHistory={shiftHistory}
      />
    </div>
  );
}
