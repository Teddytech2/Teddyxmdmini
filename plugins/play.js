const { cmd } = require('../inconnuboy');
const config = require('../config');
const axios = require('axios');

const MEDIA_API = 'https://media.cypherxbot.space';

cmd({
    pattern: "play",
    alias: ["song", "ytplay"],
    desc: "Search and download YouTube audio",
    category: "download",
    react: "🎵",
    filename: __filename
},
async (conn, mek, m, { from, q, reply, sender }) => {

    const readmore = "\u200e".repeat(4001);

    try {

        const time = new Date().toLocaleTimeString(
            'en-KE',
            { timeZone: 'Africa/Nairobi' }
        );

        // =========================
        // NO QUERY
        // =========================

        if (!q) {

            return reply(
`┏━━❐✧ *${config.BOT_NAME || 'TEDDY-XMD'} PLAY* ✧❐
┃✦ *Usage:* .play lonely by akon
┃✦ *By:* @${sender.split('@')[0]}
┃✦ *Time:* ${time}
┗❐${readmore}
_⚡ Powered by ${config.BOT_NAME || 'TEDDY-XMD'}_`,
                { mentions: [sender] }
            );
        }

        // =========================
        // WAITING REACTION
        // =========================

        await conn.sendMessage(from, {
            react: {
                text: '⏳',
                key: mek.key
            }
        });

        // =========================
        // CYPHERX YOUTUBE SEARCH
        // =========================

        const searchUrl =
            `${MEDIA_API}/search/youtube` +
            `?query=${encodeURIComponent(q)}` +
            `&media_type=audio` +
            `&max_results=1`;

        const searchRes = await axios.get(searchUrl, {
            timeout: 60000,
            headers: {
                'User-Agent': 'Mozilla/5.0',
                'Accept': 'application/json'
            }
        });

        console.log(
            '[CYPHERX SEARCH]',
            JSON.stringify(searchRes.data).slice(0, 2000)
        );

        if (!searchRes.data) {
            await conn.sendMessage(from, {
                react: {
                    text: '❌',
                    key: mek.key
                }
            });

            return reply(
                "❌ *Song not found. Try another name*"
            );
        }

        // =========================
        // GET RESULT
        // =========================

        const result = searchRes.data.result;

        if (!result) {

            await conn.sendMessage(from, {
                react: {
                    text: '❌',
                    key: mek.key
                }
            });

            return reply(
                "❌ *No song result returned*"
            );
        }

        /*
         * CypherX may return the result directly
         * or inside a results array depending on
         * the API response.
         */

        const song = Array.isArray(result)
            ? result[0]
            : result;

        if (!song) {

            await conn.sendMessage(from, {
                react: {
                    text: '❌',
                    key: mek.key
                }
            });

            return reply(
                "❌ *Song not found*"
            );
        }

        // =========================
        // VIDEO URL
        // =========================

        const videoUrl =
            song.url ||
            song.webpage_url ||
            song.original_url ||
            song.metadata?.webpage_url ||
            song.metadata?.original_url ||
            null;

        // =========================
        // DOWNLOAD URL
        // =========================

        const downloadUrl =
            song.download_url ||
            song.download ||
            null;

        /*
         * /search/youtube?media_type=audio
         * can already return a download URL.
         *
         * If it doesn't, use the normal
         * /download/youtube/audio endpoint.
         */

        let audioUrl = downloadUrl;

        if (!audioUrl && videoUrl) {

            const audioApi =
                `${MEDIA_API}/download/youtube/audio` +
                `?url=${encodeURIComponent(videoUrl)}`;

            const audioRes = await axios.get(audioApi, {
                timeout: 60000,
                headers: {
                    'User-Agent': 'Mozilla/5.0',
                    'Accept': 'application/json'
                }
            });

            console.log(
                '[CYPHERX AUDIO]',
                JSON.stringify(audioRes.data).slice(0, 2000)
            );

            const audioResult =
                audioRes.data?.result;

            if (audioResult) {

                audioUrl =
                    audioResult.download_url ||
                    audioResult.download ||
                    audioResult.url ||
                    audioResult.metadata?.url ||
                    null;
            }
        }

        // =========================
        // FINAL VALIDATION
        // =========================

        if (!audioUrl) {

            await conn.sendMessage(from, {
                react: {
                    text: '❌',
                    key: mek.key
                }
            });

            return reply(
                "❌ *Failed to get audio download link*"
            );
        }

        // =========================
        // SONG INFORMATION
        // =========================

        const title =
            song.title ||
            song.metadata?.title ||
            q;

        const duration =
            song.duration_string ||
            song.duration ||
            song.metadata?.duration_string ||
            'Unknown';

        const channel =
            song.author ||
            song.uploader ||
            song.channel ||
            song.metadata?.uploader ||
            'Unknown';

        const thumbnail =
            song.thumbnail ||
            song.metadata?.thumbnail ||
            null;

        // =========================
        // CAPTION
        // =========================

        const caption =
`┏━━❐✧ *${config.BOT_NAME || 'TEDDY-XMD'} PLAY* ✧❐
┃✦ *Title:* ${title}
┃✦ *Duration:* ${duration}
┃✦ *Channel:* ${channel}
┃✦ *Type:* MP3 Audio
┃✦ *By:* @${sender.split('@')[0]}
┃✦ *Time:* ${time}
┗❐${readmore}
_⚡ Powered by ${config.BOT_NAME || 'TEDDY-XMD'}_`;

        // =========================
        // SEND THUMBNAIL
        // =========================

        if (thumbnail) {

            await conn.sendMessage(from, {

                image: {
                    url: thumbnail
                },

                caption,

                contextInfo: {
                    mentionedJid: [sender]
                }

            }, { quoted: mek });

        } else {

            await conn.sendMessage(from, {

                text: caption,

                contextInfo: {
                    mentionedJid: [sender]
                }

            }, { quoted: mek });
        }

        // =========================
        // SEND AUDIO
        // =========================

        const safeTitle =
            title
                .replace(/[\\/:*?"<>|]/g, '')
                .trim() || 'TEDDY-XMD Song';

        await conn.sendMessage(from, {

            audio: {
                url: audioUrl
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
                text: '✅',
                key: mek.key
            }
        });

    } catch (e) {

        console.log(
            "PLAY CYPHERX ERROR:",
            e.response?.data ||
            e.message
        );

        await conn.sendMessage(from, {
            react: {
                text: '❌',
                key: mek.key
            }
        });

        const time = new Date().toLocaleTimeString(
            'en-KE',
            { timeZone: 'Africa/Nairobi' }
        );

        return reply(
`┏━━❐✧ *${config.BOT_NAME || 'TEDDY-XMD'} PLAY* ✧❐
┃✦ *Status:* Error ❌
┃✦ *Reason:* CypherX API failed or song not found
┃✦ *By:* @${sender.split('@')[0]}
┃✦ *Time:* ${time}
┗❐${readmore}
_⚡ Powered by ${config.BOT_NAME || 'TEDDY-XMD'}_`,
            { mentions: [sender] }
        );
    }
});