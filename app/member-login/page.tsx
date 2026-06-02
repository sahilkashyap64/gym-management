import MemberLoginClient from "@/app/member-login/member-login-client";
import { getGymDataStore } from "@/lib/gym-data";

export const dynamic = "force-dynamic";

export default async function MemberLoginPage() {
  const snapshot = await getGymDataStore().getDashboardSnapshot();
  return <MemberLoginClient initialSnapshot={snapshot} />;
}
