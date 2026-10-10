const { cmd } = require('../inconnuboy');

const {
    downloadContentFromMessage
} = require('xzcbailz');

// ==========================================
// 👁️ VIEW ONCE EMOJI TRIGGERS
// ==========================================

const VV2_EMOJIS = [
    "😘",
    "😍",
    "🥰",
    "😀",
    "😆",
    "😂",
    "🤣",
    "😊",
    "😎",
    "😉",
    "🤩",
    "❤️",
    "❤",
    "🔥",
    "💖",
    "💕",
    "💗",
    "💓",
    "💯",
    "👍",
    "👏",
    "😋",
    "😜",
    "🤭"
];

// ==========================================
// 👁️ VV2 COMMAND
// ==========================================

cmd({
    pattern: "vv2",

    alias: [
        "vo",
        "viewonce",
        "vv2",

        // 😍 EMOJI ALIASES
        ...VV2_EMOJIS
    ],

    desc: "Recover View Once media",
    category: "tools",
    react: "👁️",
    filename: __filename
},

async (
    conn,
    mek,
    m,
    {
        from,
        sender,
        quoted,
        reply
    }
) => {

    try {

        // ==========================================
        // 📌 MUST REPLY TO A MESSAGE
        // ==========================================

        if (!quoted) {
            return;
        }

        // ==========================================
        // 🔓 UNWRAP VIEW ONCE
        // ==========================================

        const voMessage =
            quoted.message?.viewOnceMessage?.message ||
            quoted.message?.viewOnceMessageV2?.message ||
            quoted.message?.viewOnceMessageV2Extension?.message ||
            quoted.viewOnceMessage?.message ||
            quoted.viewOnceMessageV2?.message ||
            quoted.viewOnceMessageV2Extension?.message;

        // Not View Once → silently ignore
        if (!voMessage) {
            return;
        }

        // ==========================================
        // 📦 GET MEDIA
        // ==========================================

        const image = voMessage.imageMessage;
        const video = voMessage.videoMessage;
        const audio = voMessage.audioMessage;

        const media = image || video || audio;

        if (!media) {
            return;
        }

        // ==========================================
        // 🔍 MEDIA TYPE
        // ==========================================

        let mediaType;

        if (image) {
            mediaType = "image";
        }

        else if (video) {
            mediaType = "video";
        }

        else if (audio) {
            mediaType = "audio";
        }

        // ==========================================
        // ⏳ PROCESSING REACTION
        // ==========================================

        try {
            await conn.sendMessage(
                from,
                {
                    react: {
                        text: "⏳",
                        key: mek.key
                    }
                }
            );
        } catch (_) {}

        // ==========================================
        // ⬇️ DOWNLOAD MEDIA
        // ==========================================

        const stream = await downloadContentFromMessage(
            media,
            mediaType
        );

        const chunks = [];

        for await (const chunk of stream) {
            chunks.push(chunk);
        }

        const buffer = Buffer.concat(chunks);

        if (!buffer || buffer.length === 0) {
            throw new Error("Empty View Once media buffer");
        }

        // ==========================================
        // 📥 SEND TO USER PRIVATE INBOX
        // ==========================================

        const inbox = sender;

        // ==========================================
        // 📝 CAPTION
        // ==========================================

        const caption =
            media.caption ||
            "👁️ *VIEW ONCE RECOVERED*";

        // ==========================================
        // 🖼️ IMAGE
        // ==========================================

        if (mediaType === "image") {

            await conn.sendMessage(
                inbox,
                {
                    image: buffer,
                    caption: caption
                }
            );
        }

        // ==========================================
        // 🎥 VIDEO
        // ==========================================

        else if (mediaType === "video") {

            await conn.sendMessage(
                inbox,
                {
                    video: buffer,
                    caption: caption
                }
            );
        }

        // ==========================================
        // 🎵 AUDIO
        // ==========================================

        else if (mediaType === "audio") {

            await conn.sendMessage(
                inbox,
                {
                    audio: buffer,
                    mimetype: media.mimetype || "audio/mp4",
                    ptt: media.ptt || false
                }
            );
        }

        // ==========================================
        // ✅ SUCCESS REACTION
        // ==========================================

        try {

            await conn.sendMessage(
                from,
                {
                    react: {
                        text: "✅",
                        key: mek.key
                    }
                }
            );

        } catch (_) {}

        // 🚫 NO TEXT REPLY
        return;

    } catch (error) {

        console.error(
            "❌ VV2 ERROR:",
            error
        );

        // ==========================================
        // ❌ ERROR REACTION ONLY
        // ==========================================

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

        } catch (_) {}

        // 🚫 NO ERROR MESSAGE
        // 🚫 NO TEXT REPLY
        return;
    }
});
