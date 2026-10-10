const { cmd } = require('../inconnuboy');
const axios = require('axios');

const MEDIA_API = 'https://media.cypherxbot.space';

cmd({
  pattern: "song3",
  react: "🎵",
  category: "download",
  desc: "Download songs from YouTube",
  filename: __filename

}, async (conn, mek, m, { from, q, reply }) => {

  try {

    // =========================
    // NO QUERY
    // =========================

    if (!q) {
      return reply(
        "*🎵 Music Downloader*\n\n" +
        "*Usage:*\n" +
        ".song3 <song name>\n\n" +
        "*Example:*\n" +
        ".song3 faded alan walker"
      );
    }

    // =========================
    // WAITING REACTION
    // =========================

    await conn.sendMessage(from, {
      react: {
        text: "⏳",
        key: mek.key
      }
    });

    // =========================
    // CYPHERX YOUTUBE SEARCH
    // =========================

    const apiUrl =
      `${MEDIA_API}/search/youtube` +
      `?query=${encodeURIComponent(q)}` +
      `&media_type=audio` +
      `&max_results=1`;

    const { data } = await axios.get(apiUrl, {
      timeout: 60000,
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json"
      }
    });

    console.log(
      "[CYPHERX SONG3 RESPONSE]",
      JSON.stringify(data).slice(0, 2000)
    );

    // =========================
    // VALIDATE RESPONSE
    // =========================

    if (!data || !data.success) {

      await conn.sendMessage(from, {
        react: {
          text: "❌",
          key: mek.key
        }
      });

      return reply("*❌ Song not found*");
    }

    const result = data.result;

    if (!result) {

      await conn.sendMessage(from, {
        react: {
          text: "❌",
          key: mek.key
        }
      });

      return reply("*❌ No download result returned*");
    }

    // =========================
    // DOWNLOAD URL
    // =========================

    const audioUrl =
      result.download_url ||
      result.download ||
      result.url ||
      result.metadata?.url ||
      null;

    if (!audioUrl) {

      console.log(
        "[CYPHERX] Missing audio URL:",
        JSON.stringify(result)
      );

      await conn.sendMessage(from, {
        react: {
          text: "❌",
          key: mek.key
        }
      });

      return reply("*❌ Download link not found*");
    }

    // =========================
    // SONG INFORMATION
    // =========================

    const title =
      result.title ||
      result.metadata?.title ||
      "Unknown Song";

    const artist =
      result.author ||
      result.artist ||
      result.metadata?.uploader ||
      "Unknown Artist";

    const duration =
      result.metadata?.duration_string ||
      result.duration ||
      "Unknown";

    const thumbnail =
      result.thumbnail ||
      result.metadata?.thumbnail ||
      null;

    // =========================
    // CAPTION
    // =========================

    const caption =
      `🎵 *SONG DOWNLOADER*\n\n` +
      `📌 *Title:* ${title}\n` +
      `👤 *Artist:* ${artist}\n` +
      `⏱️ *Duration:* ${duration}\n\n` +
      `⚡ *Powered By TEDDY-XMD*`;

    // =========================
    // SEND AUDIO
    // =========================

    await conn.sendMessage(from, {

      audio: {
        url: audioUrl
      },

      mimetype: "audio/mpeg",

      ptt: false,

      fileName:
        `${title.replace(/[\\/:*?"<>|]/g, "")}.mp3`,

      contextInfo: {

        externalAdReply: {

          title: title,

          body:
            artist ||
            "TEDDY-XMD",

          thumbnailUrl: thumbnail,

          sourceUrl:
            result.url ||
            result.metadata?.webpage_url ||
            audioUrl,

          mediaType: 1,

          renderLargerThumbnail: true
        }
      }

    }, { quoted: mek });

    // =========================
    // SEND INFO
    // =========================

    await reply(caption);

    // =========================
    // SUCCESS REACTION
    // =========================

    await conn.sendMessage(from, {
      react: {
        text: "✅",
        key: mek.key
      }
    });

  } catch (err) {

    console.log(
      "SONG3 CYPHERX ERROR:",
      err.response?.data ||
      err.message
    );

    await conn.sendMessage(from, {
      react: {
        text: "❌",
        key: mek.key
      }
    });

    return reply(
      "*❌ Error occurred while downloading song*"
    );
  }
});