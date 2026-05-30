import MemberAttendanceClient from "@/app/member/attendance/member-attendance-client";
import { getGymDataStore } from "@/lib/gym-data";

export default async function MemberAttendancePage() {
  const snapshot = await getGymDataStore().getDashboardSnapshot();
  return <MemberAttendanceClient initialSnapshot={snapshot} />;
}
