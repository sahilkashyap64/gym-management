import MemberLoginClient from "@/app/member-login/member-login-client";
import { getGymDataStore } from "@/lib/gym-data";

export default async function MemberLoginPage() {
  const snapshot = await getGymDataStore().getDashboardSnapshot();
  return <MemberLoginClient initialSnapshot={snapshot} />;
}
