type FeedbackPriority = "nice-to-have" | "important" | "urgent";

export interface FeedbackNotifyInput {
  title: string;
  description: string;
  priority: FeedbackPriority;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export async function notifyFeedbackTelegram(
  input: FeedbackNotifyInput
): Promise<void> {
  if (input.priority === "nice-to-have") return;

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.JACO_OWNER_CHAT_ID;
  if (!token || !chatId) {
    console.warn(
      "[notify-telegram] TELEGRAM_BOT_TOKEN or JACO_OWNER_CHAT_ID unset; skipping feedback alert"
    );
    return;
  }

  const descTrim = input.description.slice(0, 500);
  const text =
    `\uD83D\uDCDD Nuovo feedback Jaco \u2014 priorit\u00E0: <b>${escapeHtml(input.priority)}</b>\n\n` +
    `<b>Titolo:</b> ${escapeHtml(input.title)}\n` +
    `<b>Descrizione:</b> ${escapeHtml(descTrim)}\n\n` +
    `<a href="https://jaco-sales-assistant.levm.eu/feedback">Apri /feedback</a>`;

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: "HTML",
        }),
      }
    );
    if (!res.ok) {
      console.warn(
        `[notify-telegram] sendMessage non-2xx: ${res.status}`
      );
    }
  } catch (err) {
    console.warn("[notify-telegram] sendMessage failed:", err);
  }
}
