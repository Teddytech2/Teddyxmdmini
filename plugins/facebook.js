const axios = require('axios');

module.exports = {
  name: "facebook",
  alias: ["fb", "fbdl"],
  desc: "Download Facebook videos",
  category: "download",
  react: "📘",

  start: async (conn, mek, m, { text, reply }) => {

    // =========================
    // VALIDATION
    // =========================

    if (!text) {
      return reply("❌ Give me a Facebook link");
    }

    if (
      !text.includes('facebook.com') &&
      !text.includes('fb.watch')
    ) {
      return reply("❌ Invalid Facebook link");
    }

    try {

      // =========================
      // PROCESSING
      // =========================

      await reply("⏳ Downloading Facebook video...");

      // =========================
      // PRINCETECH API
      // =========================

      const api =
`https://api.princetechn.com/api/download/fbdown?apikey=prince&url=${encodeURIComponent(text)}`;

      const { data } = await axios.get(api, {
        timeout: 60000,
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Accept': 'application/json'
        }
      });

      // =========================
      // VALIDATE RESPONSE
      // =========================

      if (!data.status || !data.result) {
        return reply("❌ Failed to fetch Facebook video");
      }

      const result = data.result;

      const videoUrl =
        result.hd ||
        result.sd ||
        result.download_url ||
        result.download ||
        result.url;

      if (!videoUrl) {
        return reply("❌ Download link not found");
      }

      // =========================
      // SEND INFO
      // =========================

      if (result.thumbnail) {

        await conn.sendMessage(m.from, {

          image: {
            url: result.thumbnail
          },

          caption:
`📘 *FACEBOOK DOWNLOADER*

📌 *Title:* ${result.title || "Facebook Video"}

> ⚡ POWERED BY TEDDY-XMD ⚡`

        }, { quoted: mek });
      }

      // =========================
      // SEND VIDEO
      // =========================

      await conn.sendMessage(m.from, {

        video: {
          url: videoUrl
        },

        mimetype: "video/mp4",

        caption:
`✅ *Facebook Video Downloaded*

> ⚡ POWERED BY TEDDY-XMD ⚡`

      }, { quoted: mek });

      // =========================
      // SUCCESS REACTION
      // =========================

      await conn.sendMessage(m.from, {
        react: {
          text: "✅",
          key: mek.key
        }
      });

    } catch (e) {

      console.log("FACEBOOK CMD ERROR:", e);

      reply("❌ Error: " + e.message);
    }
  }
}