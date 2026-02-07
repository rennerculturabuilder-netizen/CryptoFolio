const TELEGRAM_API = "https://api.telegram.org/bot";

/**
 * Envia mensagem via Telegram Bot API
 */
export async function sendTelegramMessage(
  message: string
): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.warn("[Telegram] TELEGRAM_BOT_TOKEN ou TELEGRAM_CHAT_ID não configurado");
    return false;
  }

  try {
    const res = await fetch(`${TELEGRAM_API}${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "HTML",
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      console.error("[Telegram] Erro:", data.description);
      return false;
    }

    return true;
  } catch (err) {
    console.error("[Telegram] Falha ao enviar:", err);
    return false;
  }
}
