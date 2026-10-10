const { cmd } = require("../inconnuboy");
const axios = require("axios");

const API = "https://media.cypherxbot.space";

cmd({
    pattern: "ig",
    alias: ["instagram", "igdl"],
    desc: "Download Instagram reels/posts",
    category: "downloader",
    react: "📸",
    filename: __filename

}, async (conn, mek, m, { from, args, reply }) => {

    try {

        const url = args[0];

        if (!url)
            return reply(
                "❌ Please provide an Instagram link!\n\n" +
                "Example:\n" +
                ".ig https://www.instagram.com/reel/xxxx/"
            );

        if (!/instagram\.com|instagr\.am/i.test(url))
            return reply("❌ Invalid Instagram link.");

        await conn.sendMessage(from, {
            react: {
                text: "🔄",
                key: mek.key
            }
        });

        // TEDDY-XMD API
        const api =
            `${API}/download/instagram/video?url=${encodeURIComponent(url)}`;

        const { data } = await axios.get(api, {
            timeout: 60000,
            headers: {
                "User-Agent": "Mozilla/5.0",
                "Accept": "application/json"
            }
        });

        if (!data?.result)
            throw new Error("No media returned");

        const results = Array.isArray(data.result)
            ? data.result
            : [data.result];

        let sent = false;

        for (const item of results.slice(0, 10)) {

            const media =
                typeof item === "string"
                    ? item
                    : item.download_url ||
                      item.download ||
                      item.url ||
                      item.video ||
                      item.image;

            if (!media) continue;

            const type =
                typeof item === "object"
                    ? String(
                        item.type ||
                        item.media_type ||
                        item.metadata?.media_type ||
                        ""
                    ).toLowerCase()
                    : "";

            const isVideo =
                type === "video" ||
                /\.(mp4|mov|webm|mkv)(\?|$)/i.test(media);

            if (isVideo) {

                await conn.sendMessage(from, {
                    video: { url: media },
                    mimetype: "video/mp4",
                    caption:
`📸 *INSTAGRAM DOWNLOADER*

✅ Downloaded successfully

⚡ *TEDDY-XMD API*`
                }, { quoted: mek });

            } else {

                await conn.sendMessage(from, {
                    image: { url: media },
                    caption:
`📸 *INSTAGRAM DOWNLOADER*

✅ Downloaded successfully

⚡ *TEDDY-XMD API*`
                }, { quoted: mek });
            }

            sent = true;
        }

        if (!sent)
            throw new Error("No usable media URL");

        await conn.sendMessage(from, {
            react: {
                text: "✅",
                key: mek.key
            }
        });

    } catch (err) {

        console.error(
            "TEDDY-XMD API IG ERROR:",
            err.response?.data || err.message
        );

        await conn.sendMessage(from, {
            react: {
                text: "❌",
                key: mek.key
            }
        });

        reply(
            "❌ Failed to download Instagram media.\n" +
            "Please try another public Instagram link."
        );
    }
});