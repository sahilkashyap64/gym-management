const VERIFY_MODE = "subscribe";

function getVerifyToken() {
  return process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
}

export async function GET(request: Request) {
  const verifyToken = getVerifyToken();
  if (!verifyToken) {
    return Response.json({ error: "Missing WHATSAPP_WEBHOOK_VERIFY_TOKEN environment variable" }, { status: 500 });
  }

  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === VERIFY_MODE && token === verifyToken && challenge) {
    return new Response(challenge, { status: 200 });
  }

  return Response.json({ error: "Invalid WhatsApp webhook verification token" }, { status: 403 });
}

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  console.log("WhatsApp webhook event", payload);
  return Response.json({ ok: true });
}
