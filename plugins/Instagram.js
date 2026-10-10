const { cmd } = require("../inconnuboy");
const axios = require("axios");
const config = require("../config");

const API = "https://media.cypherxbot.space";
const processed = new Set();

const quoted = {
    key: {
        fromMe: false,
        participant: "0@s.whatsapp.net",
        remoteJid: "status@broadcast"
    },
    message: {
        contactMessage: {
            displayName: "𝐓𝐄𝐃𝐃𝐘-𝐗𝐌𝐃 VERIFIED ✅",
            vcard: `BEGIN:VCARD
VERSION:3.0
FN:𝐓𝐄𝐃𝐃𝐘-𝐗𝐌𝐃 VERIFIED
ORG:𝐓𝐄𝐃𝐃𝐘-𝐗𝐌𝐃 BOT;
TEL;type=CELL;type=VOICE;waid:${config.OWNER_NUMBER || "0000000000"}:+${config.OWNER_NUMBER || "0000000000"}
END:VCARD`
        }
    }
};

const ctx = {
    contextInfo: {
        forwardingScore: 999,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
            newsletterJid: "120363421104812135@newsletter",
            newsletterName: "𝐓𝐄𝐃𝐃𝐘-𝐗𝐌𝐃",
            serverMessageId: 143
        }
    }
};

cmd({
    pattern: "instagram",
    alias: ["ig", "igdl", "instalink"],
    desc: "Download Instagram media",
    category: "downloader",
    react: "📎",
    filename: __filename

}, async (conn, mek, m, { from, q, reply }) => {

    const id = m?.key?.id;

    try {

        if (id && processed.has(id)) return;

        if (id) {
            processed.add(id);
            setTimeout(() => processed.delete(id), 300000);
        }

        const url = q?.trim();

        if (!url) {
            return reply(
`╭──〔 📎 INSTAGRAM 〕──
│
├─ Send an Instagram link
│
├─ Example:
│  .instagram https://instagram.com/reel/xxxx
│
╰──〔 ⚡ TEDDY-XMD API 〕──`
            );
        }

        if (!/https?:\/\/(www\.)?(instagram\.com|instagr\.am)\//i.test(url)) {
            return reply("*❌ Invalid Instagram URL*");
        }

        await conn.sendMessage(from, {
            react: { text: "🔄", key: m.key }
        });

        // TEDDY-XMD API
        const apiUrl =
            `${API}/download/instagram/video?url=${encodeURIComponent(url)}`;

        const { data } = await axios.get(apiUrl, {
            timeout: 60000,
            headers: {
                "User-Agent": "Mozilla/5.0",
                "Accept": "application/json"
            }
        });

        if (!data?.result) {
            throw new Error("No media returned by TEDDY-XMD API");
        }

        const items = Array.isArray(data.result)
            ? data.result
            : [data.result];

        let sent = 0;

        for (const item of items.slice(0, 20)) {

            const mediaUrl = typeof item === "string"
                ? item
                : item.download_url ||
                  item.download ||
                  item.url ||
                  item.video ||
                  item.image ||
                  item.media_url;

            if (!mediaUrl) continue;

            const type = typeof item === "object"
                ? String(
                    item.type ||
                    item.media_type ||
                    item.metadata?.media_type ||
                    ""
                  ).toLowerCase()
                : "";

            const video =
                type === "video" ||
                /\.(mp4|mov|webm|mkv)(\?|$)/i.test(mediaUrl);

            const caption = video
                ? `╭──〔 🎬 INSTAGRAM VIDEO 〕──
│
├─ Status: ✅ Complete
├─ Source: Instagram
│
╰──〔 ⚡ TEDDY-XMD API 〕──`
                : `╭──〔 🖼️ INSTAGRAM IMAGE 〕──
│
├─ Status: ✅ Complete
├─ Source: Instagram
│
╰──〔 ⚡ TEDDY-XMD API 〕──`;

            await conn.sendMessage(
                from,
                video
                    ? {
                        video: { url: mediaUrl },
                        mimetype: "video/mp4",
                        caption,
                        ...ctx
                    }
                    : {
                        image: { url: mediaUrl },
                        caption,
                        ...ctx
                    },
                { quoted }
            );

            sent++;
        }

        if (!sent) {
            throw new Error("No usable media URL found");
        }

        await conn.sendMessage(from, {
            react: { text: "✅", key: m.key }
        });

    } catch (error) {

        console.error(
            "TEDDY-XMD API INSTAGRAM ERROR:",
            error.response?.data || error.message
        );

        await conn.sendMessage(from, {
            react: { text: "❌", key: m.key }
        });

        await reply(
`╭──〔 ❌ DOWNLOAD FAILED 〕──
│
├─ Unable to download the Instagram media.
├─ Try another public Instagram link.
│
╰──〔 ⚡ TEDDY-XMD API 〕──`
        );
    }
});