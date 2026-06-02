import type { MembershipReminder } from "@/lib/whatsapp-reminders";

type ReminderResult = {
  memberId: string;
  memberName: string;
  phone: string;
  ok: boolean;
  messageId?: string;
  error?: string;
};

type RequestBody = {
  reminders?: Array<Partial<MembershipReminder> | null>;
};

type WhatsAppApiError = {
  error?: {
    message?: string;
    code?: number;
    error_data?: {
      details?: string;
    };
  };
  messages?: Array<{ id?: string }>;
};

function getMetaConfig() {
  return {
    token: process.env.META_TOKEN ?? process.env.WHATSAPP_META_TOKEN,
    phoneNumberId: process.env.WHATSAPP_BUSINESS_PHONE_NUMBER_ID,
    businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID,
    apiVersion: process.env.WHATSAPP_API_VERSION ?? "v25.0",
    templateName: process.env.WHATSAPP_REMINDER_TEMPLATE_NAME,
    templateLanguage: process.env.WHATSAPP_TEMPLATE_LANGUAGE ?? "en_US",
  };
}

function getConfigStatus() {
  const config = getMetaConfig();
  return {
    configured: Boolean(config.token && config.phoneNumberId),
    hasToken: Boolean(config.token),
    hasPhoneNumberId: Boolean(config.phoneNumberId),
    hasBusinessAccountId: Boolean(config.businessAccountId),
    apiVersion: config.apiVersion,
    sendMode: config.templateName ? "template" : "text",
    templateName: config.templateName ?? null,
    templateLanguage: config.templateLanguage,
  };
}

function getWhatsAppError(data: WhatsAppApiError) {
  const message = data.error?.message ?? "WhatsApp API request failed";
  const code = data.error?.code ? ` (${data.error.code})` : "";
  const details = data.error?.error_data?.details ? `: ${data.error.error_data.details}` : "";
  return `${message}${code}${details}`;
}

function isValidReminder(value: Partial<MembershipReminder> | null): value is MembershipReminder {
  if (!value) return false;
  return Boolean(value.memberId && value.memberName && value.phone && value.message && /^\d{8,15}$/.test(value.phone));
}

function buildMessagePayload(reminder: MembershipReminder, config: ReturnType<typeof getMetaConfig>) {
  if (config.templateName) {
    return {
      messaging_product: "whatsapp",
      to: reminder.phone,
      type: "template",
      template: {
        name: config.templateName,
        language: { code: config.templateLanguage },
      },
    };
  }

  return {
    messaging_product: "whatsapp",
    to: reminder.phone,
    type: "text",
    text: {
      preview_url: false,
      body: reminder.message,
    },
  };
}

async function sendWhatsAppText(reminder: MembershipReminder, config: ReturnType<typeof getMetaConfig>) {
  const response = await fetch(`https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(buildMessagePayload(reminder, config)),
  });

  const data = (await response.json().catch(() => ({}))) as WhatsAppApiError;
  if (!response.ok) {
    return {
      ok: false,
      error: getWhatsAppError(data),
    };
  }

  return { ok: true, messageId: data.messages?.[0]?.id };
}

export async function GET() {
  return Response.json(getConfigStatus());
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
    if (!isValidReminder(reminder)) {
      results.push({
        memberId: reminder?.memberId ?? "unknown",
        memberName: reminder?.memberName ?? "Unknown member",
        phone: reminder?.phone ?? "",
        ok: false,
        error: "Invalid reminder payload or WhatsApp phone number",
      });
      continue;
    }

    const result = await sendWhatsAppText(reminder, config);
    results.push({
      memberId: reminder.memberId,
      memberName: reminder.memberName,
      phone: reminder.phone,
      ok: result.ok,
      messageId: result.messageId,
      error: result.error,
    });
  }

  return Response.json({
    config: getConfigStatus(),
    sent: results.filter((result) => result.ok).length,
    failed: results.filter((result) => !result.ok).length,
    results,
  });
}
