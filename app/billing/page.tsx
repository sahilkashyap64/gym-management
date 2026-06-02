import AdminPanel from "@/app/admin-panel";
import { getGymDataStore } from "@/lib/gym-data";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const snapshot = await getGymDataStore().getDashboardSnapshot();
  return <AdminPanel initialSnapshot={snapshot} module="billing" />;
}
