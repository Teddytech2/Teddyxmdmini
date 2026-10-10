const { cmd } = require('../inconnuboy');
const axios = require('axios');
const config = require('../config');

cmd({
  pattern: "ai",
  alias: ["gpt", "ask", "chatgpt"],
  react: "🤖",
  category: "ai",
  desc: "Chat with TEDDY-XMD AI",
  filename: __filename
}, async (conn, mek, m, { from, q, reply, pushname }) => {
  try {

    // =========================
    // CHECK PROMPT
    // =========================
    if (!q) {
      return reply(
        `┏━━❐ *AI* ❐
┃ ✧ Please provide a question.
┃ ✧ Example: ${config.PREFIX || '.'}ai Tell me a joke
┗❐

┏━━❐ *TEDDY-XMD* ❐
┃ ✦ Gemini AI
┃ ✦ Fast & Intelligent
┗❐`
      );
    }

    // =========================
    // TYPING
    // =========================
    await conn.sendPresenceUpdate('composing', from);

    // =========================
    // NEOSOFT GEMINI API
    // =========================
    const API_URL = 'https://api.neosoft.best/api/ai/gemini';

    const { data } = await axios.get(API_URL, {
      params: {
        text: q
      },
      timeout: 60000
    });

    console.log("NEOSOFT AI RESPONSE:", data);

    // =========================
    // CHECK STATUS
    // =========================
    if (!data || data.status !== true) {
      return reply(
        `┏━━❐ *AI ERROR* ❐
┃ ✧ Failed to generate a response.
┃ ✧ Please try again later.
┗❐`
      );
    }

    // =========================
    // GET RESPONSE
    // =========================
    const aiResponse = data.reply;

    if (!aiResponse || typeof aiResponse !== 'string') {
      return reply(
        `┏━━❐ *AI ERROR* ❐
┃ ✧ Empty response received.
┃ ✧ Try asking something else.
┗❐`
      );
    }

    // =========================
    // AI RESPONSE STYLE
    // =========================
    const messageText =
      `┏━━❐ *${config.BOT_NAME || 'TEDDY-XMD'}* ❐
┃✦ *User:* ${pushname || 'User'}
┃✦ *AI:* Gemini
┗❐

┏━━❐ *AI RESPONSE* ❐
┃ ✧ ${aiResponse.replace(/\n/g, '\n┃ ✧ ')}
┗❐

> TEDDY-XMD • Gemini AI`;

    await reply(messageText);

  } catch (err) {

    console.log("AI COMMAND ERROR:", err.message);

    if (err.response) {
      console.log("API STATUS:", err.response.status);
      console.log("API DATA:", err.response.data);
    }

    return reply(
      `┏━━❐ *AI ERROR* ❐
┃ ✧ AI server is unavailable.
┃ ✧ Please try again later.
┗❐

> TEDDY-XMD`
    );
  }
});
