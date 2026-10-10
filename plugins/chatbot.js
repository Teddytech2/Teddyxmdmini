const { cmd } = require("../inconnuboy");
const fetch = require("node-fetch");
const {
  getUserConfigFromMongoDB,
  updateUserConfigInMongoDB
} = require("../lib/database");

// =====================================================
// TEDDY-XMD PER-BOT MONGODB AI CHATBOT
// =====================================================

cmd({
  on: "body",
  dontAddCommandList: true
}, async (client, message, chat, {
  from,
  body,
  isGroup,
  isCmd,
  fromMe,
  botNumber,
  userConfig
}) => {
  try {
    if (!body || isCmd || isGroup || fromMe) return;
    if (!botNumber) return;

    const config = userConfig || await getUserConfigFromMongoDB(botNumber);
    const enabled = String(config.AUTO_AI || "false").toLowerCase() === "true";

    if (!enabled) return;

    await client.sendPresenceUpdate("composing", from).catch(() => {});

    const apiUrl = `https://api.neosoft.best/api/ai/gemini?text=${encodeURIComponent(body)}`;
    const response = await fetch(apiUrl);

    if (!response.ok) {
      throw new Error(`AI API returned HTTP ${response.status}`);
    }

    const data = await response.json();

    if (!data || data.status !== true || !data.reply) {
      console.log("⚠️ Invalid NeoSoft AI response:", data);
      return;
    }

    const aiReply = String(data.reply).trim();
    if (!aiReply) return;

    await client.sendMessage(
      from,
      { text: aiReply },
      { quoted: message }
    );
  } catch (error) {
    console.error("❌ Auto AI Error:", error.message);
  }
});

// =====================================================
// CHATBOT TOGGLE COMMAND
// =====================================================

cmd({
  pattern: "chatbot",
  alias: ["autoai", "aichat"],
  desc: "Enable, disable or check AI chatbot",
  category: "owner",
  react: "🤖",
  filename: __filename,
  fromMe: true
}, async (client, message, m, {
  isOwner,
  from,
  args,
  botNumber,
  reply
}) => {
  try {
    if (!isOwner) {
      return reply("🚫 *Owner-only command!*");
    }

    if (!botNumber) {
      return reply("❌ Unable to identify this connected bot.");
    }

    const cleanBotNumber = String(botNumber).replace(/[^0-9]/g, "");
    const currentConfig = await getUserConfigFromMongoDB(cleanBotNumber);
    const currentState = String(currentConfig.AUTO_AI || "false").toLowerCase() === "true";
    const action = String(args[0] || "status").toLowerCase();

    if (action === "status") {
      return reply(
        `🤖 *TEDDY-XMD CHATBOT*\n\n` +
        `📌 Status: ${currentState ? "✅ ENABLED" : "❌ DISABLED"}\n` +
        `💾 Storage: MongoDB\n` +
        `📱 Bot: ${cleanBotNumber}\n\n` +
        `Use:\n.chatbot on\n.chatbot off\n.chatbot status`
      );
    }

    if (action !== "on" && action !== "off") {
      return reply(
        "❌ Invalid option.\n\nUse:\n.chatbot on\n.chatbot off\n.chatbot status"
      );
    }

    const newState = action === "on";

    if (currentState === newState) {
      return reply(
        newState
          ? "📌 AI Chatbot is already *ENABLED*!"
          : "📌 AI Chatbot is already *DISABLED*!"
      );
    }

    currentConfig.AUTO_AI = newState ? "true" : "false";

    const saved = await updateUserConfigInMongoDB(
      cleanBotNumber,
      currentConfig
    );

    if (!saved) {
      return reply("❌ Failed to save chatbot setting to MongoDB.");
    }

    await reply(
      newState
        ? "✅ *AI CHATBOT ENABLED!*\n\nI will now reply to private messages 💬\n\n💾 Setting saved separately for this bot in MongoDB."
        : "❌ *AI CHATBOT DISABLED!*\n\nAutomatic AI replies are now OFF 🔇\n\n💾 Setting saved separately for this bot in MongoDB."
    );

    await client.sendMessage(from, {
      react: {
        text: newState ? "✅" : "❌",
        key: message.key
      }
    }).catch(() => {});
  } catch (error) {
    console.error("❌ Chatbot command error:", error);
    return reply("⚠️ Unable to change chatbot status.");
  }
});
