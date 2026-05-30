import AdminPanel from "@/app/admin-panel";
import { getGymDataStore } from "@/lib/gym-data";

export default async function WhatsAppRemindersPage() {
  const snapshot = await getGymDataStore().getDashboardSnapshot();
  return <AdminPanel initialSnapshot={snapshot} module="whatsapp-reminders" />;
}
