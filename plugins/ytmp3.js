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
// CYpherX YOUTUBE MP3
// =========================

async function getYoutubeMp3(url) {
    try {
        const api =
            `${MEDIA_API}/download/youtube/mp3?url=${encodeURIComponent(url)}`;

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
                null,

            duration:
                result.metadata?.duration_string ||
                result.duration ||
                'Unknown'
        };

    } catch (e) {
        console.log(
            'CypherX YouTube MP3 Error:',
            e.response?.data || e.message
        );

        return null;
    }
}

cmd({
    pattern: 'ytmp3',
    alias: ['song', 'mp3', 'yta'],
    desc: 'Download YouTube audio',
    category: 'download',
    react: '🎵',
    filename: __filename

}, async (sock, message, m, { from, q, reply }) => {

    const query = q ? q.trim() : '';

    if (!query) {
        return reply(
`*🎵 Please provide a song name or YouTube link*

*Example:*
.ytmp3 Shape of You`
        );
    }

    try {

        // =========================
        // SEARCH VIDEO
        // =========================

        let video;

        if (
            query.includes('youtube.com') ||
            query.includes('youtu.be')
        ) {

            video = {
                url: query,
                title: 'YouTube Audio',
                thumbnail: 'https://i.imgur.com/8amqBSN.jpeg',
                timestamp: 'Unknown',
                author: {
                    name: 'YouTube'
                }
            };

        } else {

            const search = await yts(query);

            video = search.videos[0];

            if (!video) {
                return reply('*❌ No results found*');
            }
        }

        const brandName = '⚡ POWERED BY TEDDY-XMD ⚡';

        // =========================
        // SEND INFO
        // =========================

        await sock.sendMessage(
            from,
            {
                image: {
                    url: video.thumbnail
                },

                caption:
`🎵 *TEDDY-XMD YTMP3*

📌 *Title:* ${video.title}
👤 *Channel:* ${video.author?.name || 'YouTube'}
⏳ *Duration:* ${video.timestamp || 'Unknown'}

> *${brandName}*`
            },
            { quoted: message }
        );

        // =========================
        // GET AUDIO
        // =========================

        const audioData = await getYoutubeMp3(video.url);

        if (!audioData || !audioData.download) {

            return reply(
                '*❌ Failed to fetch audio download link*'
            );
        }

        // =========================
        // SEND AUDIO
        // =========================

        await sock.sendMessage(
            from,
            {
                audio: {
                    url: audioData.download
                },

                mimetype: 'audio/mpeg',

                fileName:
                    `${audioData.title || video.title}.mp3`,

                contextInfo: {
                    externalAdReply: {
                        title:
                            audioData.title ||
                            video.title,

                        body: 'TEDDY-XMD Music',

                        thumbnailUrl:
                            audioData.thumbnail ||
                            video.thumbnail,

                        mediaType: 1,

                        renderLargerThumbnail: false,

                        sourceUrl: video.url
                    }
                }
            },
            { quoted: message }
        );

        // =========================
        // SUCCESS REACTION
        // =========================

        await sock.sendMessage(from, {
            react: {
                text: '✅',
                key: message.key
            }
        });

    } catch (e) {

        console.log('YTMP3 CMD ERROR:', e);

        return reply(
            '*❌ An error occurred while downloading audio*'
        );
    }
});