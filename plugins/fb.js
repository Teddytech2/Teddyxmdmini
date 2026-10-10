const { cmd } = require('../inconnuboy');
const axios = require('axios');

cmd({
  pattern: "fb",
  react: "☺️",
  alias: ["facebook", "fbdl"],
  category: "download",
  filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
  try {
    if (!q) return reply("*WANT TO DOWNLOAD A FACEBOOK VIDEO? 🤔 COPY THE FACEBOOK VIDEO LINK 🤗*\n*THEN TYPE LIKE THIS ☺️*\n\n*FB ❮FACEBOOK VIDEO LINK❯*\n\n*ONCE YOU TYPE IT LIKE THAT 😇 I'LL DOWNLOAD YOUR FACEBOOK VIDEO 😃 AND SEND IT HERE 😍♥️*");

    const apiUrl = `https://movanest.xyz/v2/fbdown?url=${encodeURIComponent(q)}`;
    const res = await axios.get(apiUrl);
    const data = res.data;

    // 🔎 API status check
    if (data.status !== true) {
      return reply("API ERROR 😢");
    }

    // 🔎 Results check
    if (!Array.isArray(data.results) || data.results.length === 0) {
      return reply("*FACEBOOK VIDEO NOT FOUND 🥺*");
    }

    const result = data.results[0];

    // 🎥 Quality selection based on API
    const videoUrl = result.hdQualityLink
      ? result.hdQualityLink
      : result.normalQualityLink;

    if (!videoUrl) {
      return reply("*PLEASE PROVIDE ONLY A FACEBOOK VIDEO LINK ☺️*");
    }

    // 📝 Caption from API data
    const caption = `*👑 FB VIDEO 👑*
*👑 DURATION :❯ ${result.duration}*
*👑 CREATOR :❯ ${data.creator}*
*👑 BY :❯ TEDDY-XMD 👑*`;

    await conn.sendMessage(
      from,
      {
        video: { url: videoUrl },
        mimetype: "video/mp4",
        caption: caption
      },
      { quoted: mek }
    );

  } catch (err) {
    console.log(err);
    reply("❌ An error occurred");
  }
});