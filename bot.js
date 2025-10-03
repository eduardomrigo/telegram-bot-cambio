import 'dotenv/config';
import TelegramBot from "node-telegram-bot-api";
import fetch from "node-fetch";
import express from "express";

// =================== BOT ===================
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

async function getBRLtoARS() {
  try {
    const [brlRes, arsRes] = await Promise.all([
      fetch("https://api.bitso.com/v3/ticker/?book=usdt_brl"),
      fetch("https://api.bitso.com/v3/ticker/?book=usdt_ars")
    ]);

    const brlData = await brlRes.json();
    const arsData = await arsRes.json();

    const usdtPerBrl = parseFloat(brlData.payload.last);
    const usdtPerArs = parseFloat(arsData.payload.last);

    return (usdtPerArs / usdtPerBrl).toFixed(2);
  } catch (error) {
    console.error("Erro ao buscar cotação:", error);
    return null;
  }
}

// Comandos do bot
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, "👋 Olá! Use /cambio para ver cotação do dia.");
});

bot.onText(/\/cambio/, async (msg) => {
  const chatId = msg.chat.id;
  const loadingMsg = await bot.sendMessage(chatId, "⏳ Buscando cotação...");
  const rate = await getBRLtoARS();
  
  if (rate) {
    await bot.editMessageText(`💰 <b>${rate} ARS</b>`, {
      chat_id: chatId,
      message_id: loadingMsg.message_id,
      parse_mode: "HTML"
    });
  } else {
    await bot.editMessageText("❌ Erro ao buscar cotação.", {
      chat_id: chatId,
      message_id: loadingMsg.message_id
    });
  }
});

console.log("🤖 Bot iniciado e aguardando comandos...");

// =================== API EXPRESS ===================
const app = express();
const PORT = process.env.PORT || 3000;

// Endpoint /cambio para Scriptable
app.get("/cambio", async (req, res) => {
  const rate = await getBRLtoARS();
  if (rate) {
    res.json({ rate });
  } else {
    res.status(500).json({ error: "Erro ao buscar cotação" });
  }
});

// Health check
app.get("/", (req, res) => res.send("Bot + API funcionando!"));

app.listen(PORT, () => console.log(`API rodando na porta ${PORT}`));
