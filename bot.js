import 'dotenv/config';
import express from "express";
import TelegramBot from "node-telegram-bot-api";
import fetch from "node-fetch";

// =================== CONFIGURAÇÃO ===================
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const PORT = process.env.PORT || 10000;
const BASE_URL = process.env.BASE_URL || `https://telegram-bot-cambio.onrender.com`; // Substitua pelo seu URL no Render

// =================== BOT ===================
const bot = new TelegramBot(TELEGRAM_TOKEN);

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

// =================== FUNÇÃO COTAÇÃO ===================
async function getBRLtoARS() {
  try {
    const [brlRes, arsRes] = await Promise.all([
      fetch("https://api.bitso.com/v3/ticker/?book=usdt_brl"),
      fetch("https://api.bitso.com/v3/ticker/?book=usdt_ars")
    ]);

    const brlData = await brlRes.json();
    const arsData = await arsRes.json();

    const usdtAskBrl = parseFloat(brlData.payload.ask);
    const usdtBidArs = parseFloat(arsData.payload.bid);

    // Spread de ~1.5% que a Bitso aplica na conversão direta
    const rate = (usdtBidArs / usdtAskBrl) * 0.985;
    return rate.toFixed(2);
  } catch (error) {
    console.error("Erro ao buscar cotação:", error);
    return null;
  }
}

// =================== EXPRESS ===================
const app = express();
app.use(express.json());

// Webhook endpoint para Telegram
app.post(`/bot${TELEGRAM_TOKEN}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// Endpoint API para Scriptable
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

// =================== START ===================
app.listen(PORT, async () => {
  console.log(`API rodando na porta ${PORT}`);

  // Configura webhook
  try {
    await bot.setWebHook(`${BASE_URL}/bot${TELEGRAM_TOKEN}`);
    console.log("Webhook configurado com sucesso!");
  } catch (err) {
    console.error("Erro ao configurar webhook:", err);
  }
});
