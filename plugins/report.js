const { cmd } = require("../inconnuboy");
const config = require("../config");

const DEVELOPER_NUMBER = "254799963583";

cmd({
  pattern: "report",
  alias: ["bug", "reportbug", "reporter"],
  react: "🐞",
  category: "main",
  desc: "Report a bug to the developer",
  filename: __filename
}, async (conn, mek, m, { from, q, reply, pushname }) => {

  try {

    // =========================================
    // CHECK REPORT
    // =========================================

    if (!q || !q.trim()) {
      return reply(
`┏━━❐ *${config.BOT_NAME || "TEDDY-XMD"}* ❐
┃✦ *BUG REPORT* 🐞
┗❐

┏━━❐ *REPORT* ❐
┃ ✧ Please describe the problem.
┃
┃ ✧ Example:
┃   .report play command not working
┗❐`
      );
    }

    // =========================================
    // GET USER INFORMATION
    // =========================================

    const reporter =
      from?.split("@")[0] || "Unknown";

    const name =
      pushname || "Unknown User";

    const report =
      q.trim();

    // =========================================
    // DEVELOPER JID
    // =========================================

    const developerJid =
      `${DEVELOPER_NUMBER}@s.whatsapp.net`;

    // =========================================
    // REPORT MESSAGE
    // =========================================

    const reportMessage =
`┏━━❐ *TEDDY-XMD BUG REPORT* ❐
┃🐞 *New Bug Report*
┗❐

┏━━❐ *REPORTER* ❐
┃✦ *Name:* ${name}
┃✦ *Number:* +${reporter}
┗❐

┏━━❐ *BUG* ❐
┃✦ ${report.replace(/\n/g, "\n┃✦ ")}
┗❐

┏━━❐ *BOT INFO* ❐
┃✦ *Bot:* ${config.BOT_NAME || "TEDDY-XMD"}
┃✦ *Prefix:* ${config.PREFIX || "."}
┃✦ *Mode:* ${config.WORK_TYPE || "PUBLIC"}
┗❐

> TEDDY-XMD • Bug Reporter`;

    // =========================================
    // SEND TO DEVELOPER
    // =========================================

    await conn.sendMessage(
      developerJid,
      {
        text: reportMessage
      }
    );

    // =========================================
    // CONFIRM TO USER
    // =========================================

    await reply(
`┏━━❐ *${config.BOT_NAME || "TEDDY-XMD"}* ❐
┃✦ *BUG REPORT* 🐞
┗❐

┃✦ Your bug report has been
┃  successfully sent to the developer.

┃✦ Thank you for helping improve
┃  ${config.BOT_NAME || "TEDDY-XMD"} ❤️

┗❐`
    );

  } catch (error) {

    console.error(
      "❌ BUG REPORT ERROR:",
      error
    );

    return reply(
`┏━━❐ *BUG REPORT ERROR* ❐
┃✦ Failed to send your report.
┃✦ Please try again later.
┗❐`
    );
  }
});
