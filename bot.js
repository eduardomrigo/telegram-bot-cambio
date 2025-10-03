import 'dotenv/config';
import TelegramBot from "node-telegram-bot-api";
import fetch from "node-fetch";

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN || "8393340494:AAFS3dzomt1iEnHaEYQz0MclgWDRcW9fmkQ";
// Criar bot
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

// Função para converter BRL -> ARS
async function getBRLtoARS() {
  try {
    const [brlRes, arsRes] = await Promise.all([
      fetch("https://api.bitso.com/v3/ticker/?book=usdt_brl"),
      fetch("https://api.bitso.com/v3/ticker/?book=usdt_ars")
    ]);

    const brlData = await brlRes.json();
    const arsData = await arsRes.json();

    if (!brlData.success || !arsData.success) {
      throw new Error("Erro ao buscar cotações");
    }

    const usdtPerBrl = parseFloat(brlData.payload.last);
    const usdtPerArs = parseFloat(arsData.payload.last);
    const rate = usdtPerArs / usdtPerBrl;

    return rate.toFixed(2);
  } catch (error) {
    console.error("Erro ao buscar cotação:", error);
    return null;
  }
}

// Comando /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(
    chatId,
    "👋 Olá! Use o comando /cambio para ver quantos pesos argentinos vale 1 real."
  );
});

// Comando /cambio
bot.onText(/\/cambio/, async (msg) => {
  const chatId = msg.chat.id;
  
  // Enviar mensagem de "carregando"
  const loadingMsg = await bot.sendMessage(chatId, "⏳ Buscando cotação...");
  
  const rate = await getBRLtoARS();
  
  if (rate) {
    // Editar mensagem com resultado
    await bot.editMessageText(
      `💰 <b>${rate} ARS</b>`,
      {
        chat_id: chatId,
        message_id: loadingMsg.message_id,
        parse_mode: "HTML"
      }
    );
  } else {
    await bot.editMessageText(
      "❌ Erro ao buscar cotação. Tente novamente em instantes.",
      {
        chat_id: chatId,
        message_id: loadingMsg.message_id
      }
    );
  }
});

// Log de inicialização
console.log("🤖 Bot iniciado e aguardando comandos...");

// Tratamento de erros
bot.on("polling_error", (error) => {
  console.error("Erro de polling:", error.code);
}); 