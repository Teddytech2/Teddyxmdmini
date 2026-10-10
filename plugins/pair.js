const { cmd } = require("../inconnuboy");
const crypto = require("crypto");

const PAIR_PAGE =
  "https://www.teddyxmd.run.place/code/";

cmd({
  pattern: "pair",
  alias: ["bot", "freebot", "teddyxmd", "pairme"],
  react: "🔗",
  category: "main",
  desc: "Generate WhatsApp pairing code",
  filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {

  try {

    // ==========================================
    // GET TARGET
    // ==========================================

    let targetJid = null;
    let targetNumber = null;

    const argument = q?.trim();

    // ==========================================
    // CHECK MENTION
    // ==========================================

    const mentionedJid =
      mek.message?.extendedTextMessage?.contextInfo
        ?.mentionedJid?.[0];

    // ==========================================
    // .pair
    // PAIR THE PERSON WHO SENT COMMAND
    // ==========================================

    if (!argument) {

      targetJid = m.sender || from;

    }

    // ==========================================
    // .pair @user
    // ==========================================

    else if (mentionedJid) {

      targetJid = mentionedJid;

    }

    // ==========================================
    // .pair NUMBER
    // ==========================================

    else {

      targetNumber = argument
        .replace(/[@+\-\s]/g, "")
        .replace(/\D/g, "");

      if (!targetNumber) {
        return reply(
`┏━━❐ *PAIR ERROR* ❐
┃❌ Invalid phone number.
┃
┃✦ Use an international number.
┗❐`
        );
      }

      targetJid =
        `${targetNumber}@s.whatsapp.net`;
    }

    // ==========================================
    // GET CLEAN NUMBER
    // ==========================================

    targetNumber =
      String(targetJid)
        .split("@")[0]
        .split(":")[0]
        .replace(/\D/g, "");

    if (!targetNumber) {
      return reply(
`┏━━❐ *PAIR ERROR* ❐
┃❌ Could not detect target number.
┗❐`
      );
    }

    // ==========================================
    // REMOVE OLD CODE FOR SAME NUMBER
    // ==========================================

    global.pairCodes =
      global.pairCodes || new Map();

    for (const [key, value] of global.pairCodes.entries()) {

      if (value?.number === targetNumber) {
        global.pairCodes.delete(key);
      }

    }

    // ==========================================
    // GENERATING MESSAGE
    // ==========================================

    await conn.sendMessage(
      from,
      {
        text:
`┏━━❐ *TEDDY-XMD PAIR* ❐
┃🔗 *Generating Pairing Code*
┗❐

┃✦ *Number:* +${targetNumber}
┃✦ Please wait 5-10 seconds...
┗❐`
      },
      { quoted: mek }
    );

    // ==========================================
    // REQUEST PAIRING CODE
    // ==========================================

    const code =
      await conn.requestPairingCode(targetNumber);

    if (!code) {
      throw new Error(
        "WhatsApp did not return a pairing code."
      );
    }

    // ==========================================
    // FORMAT CODE
    // ==========================================

    const cleanCode =
      String(code)
        .replace(/[^A-Za-z0-9]/g, "");

    const formattedCode =
      cleanCode
        .match(/.{1,4}/g)
        ?.join("-") || cleanCode;

    // ==========================================
    // STORE CODE
    // ==========================================

    const id =
      crypto.randomBytes(3).toString("hex");

    global.pairCodes.set(id, {
      code: cleanCode,
      number: targetNumber,
      jid: targetJid,
      createdAt: Date.now()
    });

    // ==========================================
    // EXPIRE AFTER 2 MINUTES
    // ==========================================

    setTimeout(() => {

      if (global.pairCodes) {
        global.pairCodes.delete(id);
      }

    }, 120000);

    // ==========================================
    // PAIRING PAGE
    // ==========================================

    const link =
      `${PAIR_PAGE}${id}`;

    // ==========================================
    // SEND RESULT
    // ==========================================

    await conn.sendMessage(
      from,
      {
        text:
`┏━━❐ *TEDDY-XMD* ❐
┃✦ *PAIRING CODE* 🔗
┗❐

┏━━❐ *NUMBER* ❐
┃✦ +${targetNumber}
┗❐

┏━━❐ *CODE* ❐
┃✦ *${formattedCode}*
┗❐

┏━━❐ *HOW TO PAIR* ❐
┃✦ Open WhatsApp
┃✦ Go to *Linked Devices*
┃✦ Select *Link a device*
┃✦ Choose *Link with phone number*
┃✦ Enter the code above
┗❐

┏━━❐ *PAIRING PAGE* ❐
┃✦ ${link}
┗❐

⏰ *Code expires in 2 minutes.*

> TEDDY-XMD • Pair System`
      },
      { quoted: mek }
    );

  } catch (err) {

    console.error(
      "❌ PAIR ERROR:",
      err
    );

    return conn.sendMessage(
      from,
      {
        text:
`┏━━❐ *PAIR ERROR* ❐
┃❌ Pairing failed.
┃
┃✦ ${err.message || "Unknown error"}
┃
┃✦ Please try again later.
┗❐`
      },
      { quoted: mek }
    );
  }
});
