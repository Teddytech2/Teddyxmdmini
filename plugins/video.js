const axios = require("axios");
const yts = require("yt-search");
const { cmd } = require("../inconnuboy");

const BASE_URL = "https://media.cypherxbot.space";

const NEWSLETTER_JID = "120363421104812135@newsletter";
const NEWSLETTER_NAME = "TEDDY-XMD";

function getContextInfo(query = "") {
    return {
        forwardingScore: 999,
        isForwarded: true,

        forwardedNewsletterMessageInfo: {
            newsletterJid: NEWSLETTER_JID,
            newsletterName: NEWSLETTER_NAME,
            serverMessageId: -1
        },

        ...(query
            ? {
                body: `Requested: ${query}`
            }
            : {})
    };
}

// =====================================================
// GET VIDEO FROM MEDIA API
// =====================================================

async function getVideo(videoUrl) {
    try {
        const apiUrl =
            `${BASE_URL}/download/youtube/mp4?url=${encodeURIComponent(videoUrl)}`;

        console.log("[TEDDY-XMD] Video API:", apiUrl);

        const response = await axios.get(apiUrl, {
            timeout: 120000,
            headers: {
                "User-Agent": "Mozilla/5.0",
                "Accept": "application/json"
            }
        });

        const data = response.data;

        console.log(
            "[TEDDY-XMD] API status:",
            data?.status
        );

        console.log(
            "[TEDDY-XMD] API success:",
            data?.success
        );

        const result = data?.result;

        if (!result) {
            console.log(
                "[TEDDY-XMD] No result returned"
            );
            return null;
        }

        // Your API uses result.download_url
        const download =
            result.download_url ||
            result.downloadUrl ||
            result.download ||
            result.video_url ||
            result.videoUrl ||
            result.link;

        if (!download) {
            console.log(
                "[TEDDY-XMD] No download URL found"
            );

            return null;
        }

        console.log(
            "[TEDDY-XMD] Download URL:",
            download
        );

        return {
            download,

            title:
                result.title ||
                result.metadata?.title ||
                "TEDDY-XMD Video",

            thumbnail:
                result.thumbnail ||
                result.metadata?.thumbnail ||
                null,

            duration:
                result.metadata?.duration_string ||
                result.metadata?.duration ||
                null
        };

    } catch (error) {
        console.error(
            "[TEDDY-XMD] Video API error:",
            error.response?.data ||
            error.message
        );

        return null;
    }
}

// =====================================================
// COMMAND
// =====================================================

cmd({
    pattern: "video",

    alias: [
        "ytvideo",
        "ytv",
        "ytmp4",
        "ytvid",
        "pv",
        "vx"
    ],

    use: ".video <video name or URL>",

    react: "🎬",

    desc: "Download video from YouTube",

    category: "download",

    filename: __filename

}, async (
    conn,
    mek,
    m,
    {
        from,
        args,
        q,
        reply
    }
) => {

    try {

        const searchQuery =
            q ||
            args?.join(" ") ||
            "";

        if (!searchQuery.trim()) {

            return conn.sendMessage(
                from,
                {
                    text:
                        `🎬 *TEDDY-XMD VIDEO DOWNLOADER*\n\n` +
                        `Please provide a video name or YouTube URL.\n\n` +
                        `*Example:*\n` +
                        `.video Akon Lonely`
                },
                {
                    quoted: mek
                }
            );
        }

        // =================================================
        // REACTION
        // =================================================

        try {
            await conn.sendMessage(
                from,
                {
                    react: {
                        text: "🎬",
                        key: mek.key
                    }
                }
            );
        } catch (e) {}

        // =================================================
        // DETECT URL
        // =================================================

        const isUrl =
            /^https?:\/\//i.test(
                searchQuery.trim()
            );

        let videoUrl =
            searchQuery.trim();

        let videoTitle =
            searchQuery.trim();

        let videoInfo = null;

        // =================================================
        // SEARCH YOUTUBE
        // =================================================

        if (!isUrl) {

            console.log(
                "[TEDDY-XMD] Searching YouTube:",
                searchQuery
            );

            const search =
                await yts(searchQuery);

            if (
                !search ||
                !search.videos ||
                !search.videos.length
            ) {

                return conn.sendMessage(
                    from,
                    {
                        text:
                            `❌ *No videos found.*\n\n` +
                            `Try another search term.`
                    },
                    {
                        quoted: mek
                    }
                );
            }

            videoInfo =
                search.videos[0];

            videoUrl =
                videoInfo.url;

            videoTitle =
                videoInfo.title;

        } else {

            // =============================================
            // GET INFORMATION FROM URL
            // =============================================

            try {

                const match =
                    videoUrl.match(
                        /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/))([a-zA-Z0-9_-]{11})/
                    );

                const ytId =
                    match?.[1];

                if (ytId) {

                    const result =
                        await yts({
                            videoId: ytId
                        });

                    if (result?.title) {
                        videoTitle =
                            result.title;
                    }

                    videoInfo =
                        result;
                }

            } catch (e) {
                console.log(
                    "[TEDDY-XMD] YouTube metadata error:",
                    e.message
                );
            }
        }

        // =================================================
        // VALIDATE YOUTUBE URL
        // =================================================

        const youtubeRegex =
            /^(https?:\/\/)?(www\.|m\.)?(youtube\.com\/(watch\?v=|shorts\/|embed\/|v\/)|youtu\.be\/)[a-zA-Z0-9_-]{11}/i;

        if (!youtubeRegex.test(videoUrl)) {

            return conn.sendMessage(
                from,
                {
                    text:
                        `❌ *Invalid YouTube URL.*`
                },
                {
                    quoted: mek
                }
            );
        }

        // =================================================
        // PREVIEW
        // =================================================

        if (videoInfo?.thumbnail) {

            try {

                await conn.sendMessage(
                    from,
                    {
                        image: {
                            url: videoInfo.thumbnail
                        },

                        caption:
                            `*🎬 TEDDY-XMD VIDEO PLAYER*\n\n` +

                            `╭───────────────◆\n` +

                            `│ 📑 *Title:* ` +
                            `${videoTitle}\n` +

                            `│ ⏳ *Duration:* ` +
                            `${videoInfo.timestamp || "N/A"}\n` +

                            `╰────────────────◆\n\n` +

                            `⏳ *Downloading video...*`,

                        contextInfo:
                            getContextInfo(
                                searchQuery
                            )
                    },
                    {
                        quoted: mek
                    }
                );

            } catch (e) {
                console.log(
                    "[TEDDY-XMD] Preview failed:",
                    e.message
                );
            }
        }

        // =================================================
        // GET DOWNLOAD URL
        // =================================================

        const videoData =
            await getVideo(videoUrl);

        if (
            !videoData ||
            !videoData.download
        ) {

            return conn.sendMessage(
                from,
                {
                    text:
                        `❌ *Failed to fetch video.*\n\n` +
                        `Please try again later.`
                },
                {
                    quoted: mek
                }
            );
        }

        // =================================================
        // SAFE FILE NAME
        // =================================================

        const finalTitle =
            videoData.title ||
            videoTitle ||
            "TEDDY-XMD Video";

        const safeTitle =
            String(finalTitle)
                .replace(/[^\w\s\-()]/g, "")
                .replace(/\s+/g, " ")
                .trim()
                .slice(0, 100) ||
            "video";

        // =================================================
        // SEND VIDEO DIRECTLY
        // =================================================

        console.log(
            "[TEDDY-XMD] Sending video directly:",
            videoData.download
        );

        await conn.sendMessage(
            from,
            {
                video: {
                    url: videoData.download
                },

                mimetype:
                    "video/mp4",

                fileName:
                    `${safeTitle}.mp4`,

                caption:
                    `✅ *${finalTitle}*\n\n` +

                    `🎬 *YouTube Video*\n` +

                    `⚡ *TEDDY-XMD Downloader*`,

                contextInfo:
                    getContextInfo(
                        searchQuery
                    )
            },
            {
                quoted: mek
            }
        );

        // =================================================
        // SUCCESS
        // =================================================

        await conn.sendMessage(
            from,
            {
                react: {
                    text: "✅",
                    key: mek.key
                }
            }
        );

        console.log(
            "[TEDDY-XMD] Video sent successfully"
        );

    } catch (error) {

        console.error(
            "[TEDDY-XMD VIDEO ERROR]",
            error
        );

        try {
            await conn.sendMessage(
                from,
                {
                    react: {
                        text: "❌",
                        key: mek.key
                    }
                }
            );
        } catch (e) {}

        return conn.sendMessage(
            from,
            {
                text:
                    `❌ *Download failed.*\n\n` +
                    `${error?.message || "Unknown error"}`
            },
            {
                quoted: mek
            }
        );
    }
});
