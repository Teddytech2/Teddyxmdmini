const { cmd } = require('../inconnuboy');
const axios = require('axios');

const AXIOS_DEFAULTS = {
    timeout: 60000,
    headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json'
    }
};

cmd({
    pattern: "xvideos",
    alias: ["xv", "xvideosdl"],
    desc: "Download XVideos videos",
    category: "download",
    react: "🔞",
    filename: __filename

}, async (sock, message, m, { from, q, reply }) => {

    const url = q ? q.trim() : "";

    if (!url) {

        return reply(
`*🔞 Please provide an XVideos link*

*Example:*
.xvideos https://www.xvideos.com/videoxxxxx`
        );
    }

    try {

        // =========================
        // API REQUEST
        // =========================

        const api =
            `https://media.cypherxbot.space/download/instagram/video?url=${encodeURIComponent(url)}`;

        const { data } = await axios.get(api, AXIOS_DEFAULTS);

        if (!data.status || !data.result) {
            return reply("*❌ Failed to fetch video*");
        }

        const result = data.result;

        const videoUrl =
            result.download_url ||
            result.download ||
            result.url;

        if (!videoUrl) {
            return reply("*❌ Download link not found*");
        }

        // =========================
        // SEND INFO
        // =========================

        await sock.sendMessage(from, {

            image: {
                url:
                    result.thumbnail ||
                    "https://i.imgur.com/8amqBSN.jpeg"
            },

            caption:
`🔞 *XVIDEOS DOWNLOADER*

📌 *Title:* ${result.title || "Unknown"}
⏳ *Duration:* ${result.duration || "Unknown"}

> ⚡ POWERED BY TEDDY-XMD ⚡`

        }, { quoted: message });

        // =========================
        // SEND VIDEO
        // =========================

        await sock.sendMessage(from, {

            video: {
                url: videoUrl
            },

            mimetype: "video/mp4",

            caption:
`*${result.title || "XVideos Video"}*

> ⚡ POWERED BY TEDDY-XMD ⚡`

        }, { quoted: message });

        // =========================
        // SUCCESS REACTION
        // =========================

        await sock.sendMessage(from, {
            react: {
                text: "✅",
                key: message.key
            }
        });

    } catch (e) {

        console.log("XVIDEOS CMD ERROR:", e);

        reply("*❌ Error occurred while downloading video*");
    }
});