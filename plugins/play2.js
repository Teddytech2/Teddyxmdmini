const { cmd } = require('../inconnuboy');
const axios = require('axios');
const config = require('../config');

const PLAY_API = 'https://api.neosoft.best/api/downloader/youtube-play';

cmd({
    pattern: "play2",
    alias: ["song2", "audio"],
    desc: "YouTube Audio Player (Neosoft Engine)",
    category: "download",
    filename: __filename

}, async (conn, m, mek, { from, q, reply, sender, body }) => {

    try {

        // =========================
        // GET QUERY
        // =========================

        if (!q && body && body.includes(" ")) {
            q = body.split(" ").slice(1).join(" ");
        }

        if (!q) {
            return reply(
                " *ᴘʟᴇᴀsᴇ ᴘʀᴏᴠɪᴅᴇ ᴀ sᴏɴɢ ɴᴀᴍᴇ ᴏʀ ʟɪɴᴋ.*"
            );
        }

        // =========================
        // REACTION
        // =========================

        await conn.sendMessage(from, {
            react: {
                text: "⚡",
                key: mek.key
            }
        });

        // =========================
        // iOS STYLE VCARD
        // =========================

        const iosvCard = {
            key: {
                fromMe: false,
                participant: "0@s.whatsapp.net",
                remoteJid: "status@broadcast"
            },

            message: {
                contactMessage: {
                    displayName: " TEDDY-XMD MUSIC",

                    vcard:
`BEGIN:VCARD
VERSION:3.0
FN: TEDDY-XMD
TEL;type=CELL;type=VOICE;waid=254799963583:+254799963583
END:VCARD`
                }
            }
        };

        // =========================
        // NEOSOFT YOUTUBE AUDIO API
        // =========================

        const api =
            `${PLAY_API}?q=${encodeURIComponent(q)}&type=mp3`;

        const searchRes = await axios.get(api, {
            timeout: 60000,
            headers: {
                "User-Agent": "Mozilla/5.0",
                "Accept": "application/json"
            }
        });

        console.log(
            "[NEOSOFT PLAY2]",
            JSON.stringify(searchRes.data).slice(0, 2000)
        );

        // =========================
        // CHECK RESPONSE
        // =========================

        const data = searchRes.data;

        if (
            !data ||
            data.status !== true ||
            !data.download
        ) {

            await conn.sendMessage(from, {
                react: {
                    text: "❌",
                    key: mek.key
                }
            });

            return reply(
                "❌ *ꜱᴏɴɢ ɴᴏᴛ ꜰᴏᴜɴᴅ ᴏʀ ᴀᴜᴅɪᴏ ᴜɴᴀᴠᴀɪʟᴀʙʟᴇ.*"
            );
        }

        // =========================
        // RESPONSE DATA
        // =========================

        const finalAudioUrl = data.download;

        const title =
            data.title ||
            "Unknown";

        const uploader =
            data.artist ||
            "Unknown";

        const duration =
            data.durationText ||
            "Unknown";

        const thumbnail =
            data.thumbnail ||
            "https://i.imgur.com/8amqBSN.jpeg";

        const youtubeUrl =
            data.source ||
            `https://youtube.com/watch?v=${data.id || ""}`;

        // =========================
        // CAPTION
        // =========================

        const playCaption =
            `* ɴᴏᴡ ᴘʟᴀʏɪɴɢ* 🎶\n\n` +
            `*ᴛɪᴛʟᴇ:* ${title}\n` +
            `*ᴀʀᴛɪsᴛ:* ${uploader}\n` +
            `*ᴅᴜʀᴀᴛɪᴏɴ:* ${duration}\n\n` +
            `> *ᴅᴏᴡɴʟᴏᴀᴅɪɴɢ ꜰʀᴏᴍ ɴᴇᴏsᴏꜰᴛ sᴇʀᴠᴇʀ...*`;

        // =========================
        // SEND THUMBNAIL
        // =========================

        await conn.sendMessage(from, {

            image: {
                url: thumbnail
            },

            caption: playCaption,

            contextInfo: {

                mentionedJid: sender
                    ? [sender]
                    : [],

                forwardingScore: 1,
                isForwarded: true,

                forwardedNewsletterMessageInfo: {

                    newsletterJid:
                        config.NEWSLETTER_JID ||
                        '120363421104812135@newsletter',

                    newsletterName:
                        "𝚃𝙴𝙳𝙳𝚈-𝚇𝙼𝙳 ᴍᴜsɪᴄ",

                    serverMessageId: 1
                },

                externalAdReply: {

                    title:
                        " 𝚃𝙴𝙳𝙳𝚈-𝚇𝙼𝙳 ᴍᴜsɪᴄ",

                    body:
                        "ʀᴇᴀᴅʏ ꜰᴏʀ ᴅᴏᴡɴʟᴏᴀᴅ",

                    mediaType: 1,

                    renderLargerThumbnail: false,

                    thumbnailUrl:
                        thumbnail,

                    sourceUrl:
                        youtubeUrl
                }
            }

        }, { quoted: iosvCard });

        // =========================
        // SEND AUDIO
        // =========================

        const safeTitle =
            title
                .replace(/[\\/:*?"<>|]/g, "")
                .trim() || "TEDDY-XMD Audio";

        await conn.sendMessage(from, {

            audio: {
                url: finalAudioUrl
            },

            mimetype: "audio/mpeg",

            fileName:
                `${safeTitle}.mp3`

        }, { quoted: mek });

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
            "PLAY2 NEOSOFT ERROR:",
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
            "❌ *ꜰᴀᴛᴀʟ ᴇʀʀᴏʀ ᴡʜɪʟᴇ ᴅᴏᴡɴʟᴏᴀᴅɪɴɢ ᴀᴜᴅɪᴏ.*"
        );
    }
});
