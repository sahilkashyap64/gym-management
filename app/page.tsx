import AdminPanel from "@/app/admin-panel";
import { getGymDataStore } from "@/lib/gym-data";

export default async function Home() {
  const dataStore = getGymDataStore();
  const snapshot = await dataStore.getDashboardSnapshot();

  return <AdminPanel initialSnapshot={snapshot} module="overview" />;
}
