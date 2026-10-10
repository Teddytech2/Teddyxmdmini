const { cmd } = require('../inconnuboy');
const axios = require('axios');

const MEDIA_API = 'https://media.cypherxbot.space';

cmd({
    pattern: "tiktok",
    alias: ["tt", "ttdl", "tiktokdl"],
    desc: "Download TikTok videos without watermarks",
    category: "download",
    react: "🎵",
    filename: __filename

}, async (conn, m, mek, { from, args, reply }) => {

    const react = async (text) => {
        try {
            await conn.sendMessage(from, {
                react: {
                    text,
                    key: mek.key
                }
            });
        } catch (_) {}
    };

    try {

        // =========================
        // VALIDATE INPUT
        // =========================

        if (!args || !args[0]) {
            return reply(
                "❌ Please provide a TikTok video link.\n\n" +
                "Example:\n" +
                ".tiktok https://vt.tiktok.com/ZSag54Wbe/"
            );
        }

        const tiktokUrl = args[0].trim();

        if (
            !tiktokUrl.includes("tiktok.com") &&
            !tiktokUrl.includes("vm.tiktok.com")
        ) {
            return reply(
                "❌ The provided link does not appear to be a valid TikTok URL."
            );
        }

        const start = Date.now();

        await react("🎵");

        // =========================
        // REQUEST VIDEO DATA
        // =========================

        const apiUrl =
            `${MEDIA_API}/download/tiktok/video?url=${encodeURIComponent(tiktokUrl)}`;

        console.log("[TEDDY-XMD TIKTOK]");
        console.log("URL:", tiktokUrl);
        console.log("API:", apiUrl);

        const response = await axios.get(apiUrl, {
            timeout: 60000,
            headers: {
                "User-Agent": "Mozilla/5.0",
                "Accept": "application/json"
            },

            // Allow custom handling of non-2xx responses
            validateStatus: () => true
        });

        console.log("[TIKTOK API STATUS]:", response.status);

        console.log(
            "[TIKTOK API RESPONSE]:",
            JSON.stringify(response.data).slice(0, 3000)
        );

        // =========================
        // VALIDATE API RESPONSE
        // =========================

        if (response.status < 200 || response.status >= 300) {
            await react("❌");

            return reply(
                `❌ The TikTok service returned HTTP ${response.status}.\n\n` +
                "Please try again later."
            );
        }

        const data = response.data;

        if (!data) {
            await react("❌");

            return reply(
                "❌ The TikTok service returned an empty response."
            );
        }

        // =========================
        // EXTRACT RESULT
        // =========================

        const result =
            data.result ||
            data.data ||
            data;

        // =========================
        // EXTRACT VIDEO URL
        // =========================

        const videoUrl =
            result.download_url ||
            result.downloadUrl ||
            result.download ||
            result.video_url ||
            result.videoUrl ||
            result.video ||
            result.url ||
            result.nowm ||
            result.no_watermark ||
            result.noWatermark ||
            result.media?.video ||
            result.media?.url ||
            result.metadata?.download_url ||
            result.metadata?.downloadUrl ||
            result.metadata?.video ||
            result.metadata?.url ||
            null;

        if (
            !videoUrl ||
            typeof videoUrl !== "string"
        ) {
            await react("❌");

            console.error(
                "[TIKTOK] No downloadable video URL found:",
                JSON.stringify(data).slice(0, 5000)
            );

            return reply(
                "❌ The TikTok service did not return a downloadable video.\n\n" +
                "Please try another TikTok link."
            );
        }

        // =========================
        // EXTRACT METADATA
        // =========================

        const meta =
            result.metadata ||
            data.metadata ||
            {};

        const title =
            result.title ||
            meta.title ||
            result.desc ||
            meta.desc ||
            "TikTok Video";

        const author =
            result.author ||
            result.username ||
            result.uploader ||
            meta.author ||
            meta.username ||
            meta.uploader ||
            "Unknown";

        // =========================
        // CALCULATE RESPONSE TIME
        // =========================

        const speed = Date.now() - start;

        // =========================
        // PREPARE CAPTION
        // =========================

        const caption =
            `🎵 *TEDDY-XMD TikTok Downloader*\n\n` +
            `📌 *Title:* ${title}\n` +
            `👤 *Author:* ${author}\n` +
            `⚡ *Response Time:* ${speed} ms\n\n` +
            `> ⚡ POWERED BY TEDDY-XMD ⚡`;

        // =========================
        // SEND VIDEO
        // =========================

        await conn.sendMessage(
            from,
            {
                video: {
                    url: videoUrl
                },
                mimetype: "video/mp4",
                caption
            },
            {
                quoted: mek
            }
        );

        // =========================
        // CONFIRM SUCCESS
        // =========================

        await react("✅");

        console.log(
            `[TEDDY-XMD TIKTOK] Download completed successfully in ${speed} ms`
        );

    } catch (err) {

        console.error("[TEDDY-XMD TIKTOK ERROR]");
        console.error("Code:", err.code);
        console.error("Message:", err.message);

        if (err.response) {
            console.error("Status:", err.response.status);

            console.error(
                "Response:",
                JSON.stringify(err.response.data).slice(0, 3000)
            );
        }

        await react("❌");

        // =========================
        // HANDLE DNS ERRORS
        // =========================

        if (err.code === "ENOTFOUND") {
            return reply(
                "❌ The TikTok download service is currently unreachable.\n\n" +
                "Please try again later."
            );
        }

        // =========================
        // HANDLE TIMEOUT ERRORS
        // =========================

        if (
            err.code === "ECONNABORTED" ||
            err.code === "ETIMEDOUT"
        ) {
            return reply(
                "❌ The TikTok service took too long to respond.\n\n" +
                "Please try again."
            );
        }

        return reply(
            "❌ An error occurred while downloading the TikTok video.\n\n" +
            "Please verify the link and try again."
        );
    }
});
