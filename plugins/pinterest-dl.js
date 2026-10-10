const { cmd } = require("../inconnuboy");
const axios = require("axios");

const TEDDY_API = "https://media.cypherxbot.space";

cmd({
    pattern: "pindl",
    alias: ["pinterestdl", "pint", "pins", "pindownload"],
    desc: "Download media from Pinterest",
    category: "download",
    react: "📌",
    filename: __filename

}, async (conn, mek, m, { args, from, reply }) => {

    const url = args?.[0];

    if (!url) {
        return reply(
`❌ *Please provide a Pinterest URL*

Example:
.pindl https://pin.it/xxxxxx`
        );
    }

    try {

        await conn.sendMessage(from, {
            react: {
                text: "⏳",
                key: mek.key
            }
        });

        // ==============================
        // TEDDY-XMD API
        // ==============================

        const api =
            `${TEDDY_API}/download/pinterest` +
            `?url=${encodeURIComponent(url)}`;

        const { data } = await axios.get(api, {
            timeout: 60000,
            headers: {
                "User-Agent": "Mozilla/5.0",
                "Accept": "application/json"
            }
        });

        console.log(
            "TEDDY-XMD PINTEREST:",
            JSON.stringify(data).slice(0, 1000)
        );

        if (!data?.result) {
            throw new Error("No media returned");
        }

        // ==============================
        // NORMALIZE RESULT
        // ==============================

        const result = data.result;

        const media = Array.isArray(result)
            ? result
            : Array.isArray(result.media)
                ? result.media
                : [result];

        let sent = false;

        // ==============================
        // SEND MEDIA
        // ==============================

        for (const item of media) {

            const mediaUrl =
                typeof item === "string"
                    ? item
                    : item.download_url ||
                      item.download ||
                      item.url ||
                      item.media_url;

            if (!mediaUrl) continue;

            const type =
                typeof item === "object"
                    ? String(
                        item.type ||
                        item.media_type ||
                        ""
                      ).toLowerCase()
                    : "";

            const isVideo =
                type.includes("video") ||
                /\.(mp4|webm|mov)(\?|$)/i.test(mediaUrl);

            const caption =
`📌 *TEDDY-XMD PINTEREST*

📍 *Source:* Pinterest
📦 *Type:* ${isVideo ? "Video" : "Image"}

> ⚡ *POWERED BY TEDDY-XMD API*`;

            if (isVideo) {

                await conn.sendMessage(from, {
                    video: {
                        url: mediaUrl
                    },
                    mimetype: "video/mp4",
                    caption
                }, {
                    quoted: mek
                });

            } else {

                await conn.sendMessage(from, {
                    image: {
                        url: mediaUrl
                    },
                    caption
                }, {
                    quoted: mek
                });
            }

            sent = true;

            // Send only the first valid media
            break;
        }

        if (!sent) {
            throw new Error("No downloadable media found");
        }

        await conn.sendMessage(from, {
            react: {
                text: "✅",
                key: mek.key
            }
        });

    } catch (error) {

        console.error(
            "❌ TEDDY-XMD PINTEREST ERROR:",
            error.response?.data ||
            error.message
        );

        await conn.sendMessage(from, {
            react: {
                text: "❌",
                key: mek.key
            }
        });

        return reply(
`❌ *Pinterest download failed*

The TEDDY-XMD API did not return a downloadable media URL.`
        );
    }
});
