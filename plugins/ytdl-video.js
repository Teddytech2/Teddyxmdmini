const { cmd } = require('../inconnuboy');
const axios = require('axios');
const yts = require('yt-search');

const MEDIA_API = 'https://media.cypherxbot.space';

const AXIOS_DEFAULTS = {
    timeout: 60000,
    headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json'
    }
};

// =========================
// GET YOUTUBE MP4 DOWNLOAD
// =========================

async function getYoutubeMp4(url) {
    try {
        const api =
            `${MEDIA_API}/download/youtube/mp4?url=${encodeURIComponent(url)}`;

        const res = await axios.get(api, AXIOS_DEFAULTS);

        const result = res?.data?.result;

        if (!result) {
            console.log('CypherX response:', res?.data);
            return null;
        }

        return {
            download:
                result.download_url ||
                result.download ||
                result.url ||
                null,

            title:
                result.title ||
                result.metadata?.title ||
                'Unknown Title',

            thumbnail:
                result.thumbnail ||
                result.metadata?.thumbnail ||
                null
        };

    } catch (e) {
        console.log(
            'CypherX YouTube MP4 Error:',
            e.response?.data || e.message
        );

        return null;
    }
}

cmd({
    pattern: "video",
    alias: ["mp4", "ytmp4"],
    desc: "Download video from YouTube by name",
    category: "download",
    react: "🎬",
    filename: __filename

}, async (sock, message, m, { from, q, reply }) => {

    const query = q ? q.trim() : "";

    if (!query) {
        return reply(
`*🔍 Please provide a video name*

*Example:*
.video Tajdar e Haram`
        );
    }

    try {

        // =========================
        // SEARCH YOUTUBE
        // =========================

        const search = await yts(query);

        const video = search.videos[0];

        if (!video) {
            return reply(
                "*❌ No videos found for your search*"
            );
        }

        const brandName = "⚡ POWERED BY TEDDY-XMD ⚡";

        // =========================
        // SEND VIDEO INFORMATION
        // =========================

        await sock.sendMessage(
            from,
            {
                image: {
                    url: video.thumbnail
                },

                caption:
`*${video.title}*

🎥 *Channel:* ${video.author?.name || "YouTube"}
👁️ *Views:* ${video.views?.toLocaleString() || "Unknown"}
⏳ *Duration:* ${video.timestamp || "Unknown"}
🔗 *Link:* ${video.url}

> *${brandName}*`
            },
            { quoted: message }
        );

        // =========================
        // GET DOWNLOAD LINK
        // =========================

        const videoData = await getYoutubeMp4(video.url);

        if (!videoData || !videoData.download) {

            return reply(
                "*❌ Failed to get video download link. Try again later*"
            );
        }

        // =========================
        // SEND VIDEO
        // =========================

        await sock.sendMessage(
            from,
            {
                video: {
                    url: videoData.download
                },

                mimetype: "video/mp4",

                caption:
`*${videoData.title || video.title}*

> *${brandName}*`
            },
            { quoted: message }
        );

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

        console.log("VIDEO CMD ERROR:", e);

        return reply(
            "*❌ An error occurred while downloading the video*"
        );
    }
});