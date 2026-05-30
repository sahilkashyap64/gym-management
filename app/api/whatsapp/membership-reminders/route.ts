import type { MembershipReminder } from "@/lib/whatsapp-reminders";

type ReminderResult = {
  memberId: string;
  memberName: string;
  phone: string;
  ok: boolean;
  error?: string;
};

type RequestBody = {
  reminders?: MembershipReminder[];
};

function getMetaConfig() {
  return {
    token: process.env.META_TOKEN ?? process.env.WHATSAPP_META_TOKEN,
    phoneNumberId: process.env.WHATSAPP_BUSINESS_PHONE_NUMBER_ID,
    apiVersion: process.env.WHATSAPP_API_VERSION ?? "v20.0",
  };
}

async function sendWhatsAppText(reminder: MembershipReminder, config: ReturnType<typeof getMetaConfig>) {
  const response = await fetch(`https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: reminder.phone,
      text: { body: reminder.message },
    }),
  });

  const data = (await response.json().catch(() => ({}))) as { error?: { message?: string; code?: number } };
  if (!response.ok) {
    return {
      ok: false,
      error: data.error?.message ? `${data.error.message}${data.error.code ? ` (${data.error.code})` : ""}` : "WhatsApp API request failed",
    };
  }

  return { ok: true };
}

export async function POST(request: Request) {
  const config = getMetaConfig();
  if (!config.token || !config.phoneNumberId) {
    return Response.json(
      { error: "Missing META_TOKEN/WHATSAPP_META_TOKEN or WHATSAPP_BUSINESS_PHONE_NUMBER_ID environment variable" },
      { status: 400 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as RequestBody;
  const reminders = Array.isArray(body.reminders) ? body.reminders : [];
  if (!reminders.length) {
    return Response.json({ error: "No reminders selected" }, { status: 400 });
  }

  const results: ReminderResult[] = [];
  for (const reminder of reminders) {
    if (!reminder.memberId || !reminder.memberName || !reminder.phone || !reminder.message) {
      results.push({
        memberId: reminder.memberId ?? "unknown",
        memberName: reminder.memberName ?? "Unknown member",
        phone: reminder.phone ?? "",
        ok: false,
        error: "Invalid reminder payload",
      });
      continue;
    }

    const result = await sendWhatsAppText(reminder, config);
    results.push({
      memberId: reminder.memberId,
      memberName: reminder.memberName,
      phone: reminder.phone,
      ok: result.ok,
      error: result.error,
    });
  }

  return Response.json({
    sent: results.filter((result) => result.ok).length,
    failed: results.filter((result) => !result.ok).length,
    results,
  });
}
