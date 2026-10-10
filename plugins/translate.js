const { cmd } = require('../inconnuboy');
const axios = require('axios');
const config = require('../config');

cmd({
  pattern: "translate",
  alias: ["tr", "trans", "tranlate"],
  react: "🌐",
  category: "ai",
  desc: "Translate text into another language",
  filename: __filename
}, async (conn, mek, m, { from, q, reply, quoted }) => {
  try {

    // =========================
    // CHECK INPUT
    // =========================

    let text = q?.trim();

    if (!text && quoted) {
      text =
        quoted.text ||
        quoted.caption ||
        quoted.body ||
        "";
    }

    if (!text) {
      return reply(
`┏━━❐ *${config.BOT_NAME || "TEDDY-XMD"}* ❐
┃✦ *TRANSLATOR* 🌐
┗❐

┏━━❐ *USAGE* ❐
┃ ✧ Use: text to language
┃ ✧ You can also reply to a
┃   message and use the command.
┗❐`
      );
    }

    // =========================
    // FIND "TO LANGUAGE"
    // =========================

    const match = text.match(
      /^(.+?)\s+to\s+([a-zA-ZÀ-ÿ\s]+)$/i
    );

    if (!match) {
      return reply(
`┏━━❐ *TRANSLATOR* ❐
┃✦ Invalid format.
┃
┃✧ Use: text to language
┗❐`
      );
    }

    const sourceText = match[1].trim();
    const targetLanguage = match[2].trim();

    if (!sourceText || !targetLanguage) {
      return reply(
`┏━━❐ *TRANSLATOR ERROR* ❐
┃ ✧ Missing text or language.
┗❐`
      );
    }

    // =========================
    // TYPING
    // =========================

    await conn.sendPresenceUpdate("composing", from);

    // =========================
    // GEMINI PROMPT
    // =========================

    const prompt = `
Translate this text into ${targetLanguage}.

IMPORTANT:
- Return ONLY the translation.
- Do not explain anything.
- Do not add quotation marks.
- Preserve emojis.
- Preserve the original meaning.
- Keep the same line breaks where possible.

Text:
${sourceText}
`;

    // =========================
    // NEOSOFT GEMINI API
    // =========================

    const API_URL =
      "https://api.neosoft.best/api/ai/gemini";

    const { data } = await axios.get(API_URL, {
      params: {
        text: prompt
      },
      timeout: 60000
    });

    console.log("TRANSLATE API RESPONSE:", data);

    // =========================
    // CHECK API
    // =========================

    if (!data || data.status !== true) {
      return reply(
`┏━━❐ *TRANSLATOR ERROR* ❐
┃ ✧ Translation failed.
┃ ✧ Please try again.
┗❐`
      );
    }

    const translatedText = data.reply;

    if (
      !translatedText ||
      typeof translatedText !== "string"
    ) {
      return reply(
`┏━━❐ *TRANSLATOR ERROR* ❐
┃ ✧ Empty translation received.
┗❐`
      );
    }

    // =========================
    // FORMAT RESPONSE
    // =========================

    const formatted =
      translatedText
        .trim()
        .replace(/\n/g, "\n┃ ✧ ");

    const message =
`┏━━❐ *${config.BOT_NAME || "TEDDY-XMD"}* ❐
┃✦ *Translator:* Gemini
┃✦ *To:* ${targetLanguage}
┗❐

┏━━❐ *TRANSLATION* ❐
┃ ✧ ${formatted}
┗❐

> TEDDY-XMD • AI Translator`;

    await reply(message);

  } catch (err) {

    console.log(
      "TRANSLATE COMMAND ERROR:",
      err.message
    );

    if (err.response) {
      console.log(
        "API STATUS:",
        err.response.status
      );

      console.log(
        "API DATA:",
        err.response.data
      );
    }

    return reply(
`┏━━❐ *TRANSLATOR ERROR* ❐
┃ ✧ Translation server is busy.
┃ ✧ Please try again later.
┗❐

> TEDDY-XMD`
    );
  }
});
