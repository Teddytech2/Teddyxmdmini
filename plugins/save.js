const { cmd } = require('../inconnuboy');
const config = require('../config');
const {
    downloadContentFromMessage
} = require('xzcbailz');

cmd({
    pattern: "save",
    alias: ["savestatus", "statussave"],
    desc: "Save a quoted WhatsApp status",
    category: "main",
    filename: __filename
}, async (conn, m, mek, { from, reply }) => {
    try {

        // ==================================================
        // 1. GET QUOTED MESSAGE
        // ==================================================
        let quoted = null;

        if (m.quoted) {
            quoted = m.quoted;
        } else if (m.msg?.contextInfo?.quotedMessage) {
            quoted = m.msg.contextInfo.quotedMessage;
        }

        if (!quoted) {
            return reply(
                "❌ *Please reply to an image or video status with .save*"
            );
        }

        // ==================================================
        // 2. EXTRACT REAL MESSAGE
        // ==================================================
        let message = quoted;

        if (quoted.message) {
            message = quoted.message;
        }

        // ==================================================
        // 3. FIND MEDIA
        // ==================================================
        let mediaMessage = null;
        let mediaType = null;

        if (message.imageMessage) {
            mediaMessage = message.imageMessage;
            mediaType = "image";
        }

        if (message.videoMessage) {
            mediaMessage = message.videoMessage;
            mediaType = "video";
        }

        // Some Baileys wrappers expose it directly
        if (!mediaMessage && quoted.imageMessage) {
            mediaMessage = quoted.imageMessage;
            mediaType = "image";
        }

        if (!mediaMessage && quoted.videoMessage) {
            mediaMessage = quoted.videoMessage;
            mediaType = "video";
        }

        if (!mediaMessage) {
            return reply(
                "❌ *Please reply directly to an image or video status.*"
            );
        }

        // ==================================================
        // 4. DOWNLOAD REACTION
        // ==================================================
        try {
            await conn.sendMessage(from, {
                react: {
                    text: "📥",
                    key: mek.key
                }
            });
        } catch (e) {}

        // ==================================================
        // 5. DOWNLOAD MEDIA
        // ==================================================
        let stream;

        try {
            stream = await downloadContentFromMessage(
                mediaMessage,
                mediaType
            );
        } catch (error) {
            console.error("STATUS DOWNLOAD ERROR:", error);

            return reply(
                "❌ *Unable to download this status.*\n\n" +
                "The status may have expired or the media is no longer available."
            );
        }

        const chunks = [];

        for await (const chunk of stream) {
            chunks.push(chunk);
        }

        const mediaBuffer = Buffer.concat(chunks);

        if (!mediaBuffer.length) {
            return reply("❌ *Downloaded status media is empty.*");
        }

        // ==================================================
        // 6. CAPTION
        // ==================================================
        const caption =
            mediaMessage.caption ||
            quoted.caption ||
            message.caption ||
            "";

        // ==================================================
        // 7. FAKE VCARD
        // ==================================================
        const fakeVCard = {
            key: {
                fromMe: false,
                participant: "0@s.whatsapp.net",
                remoteJid: "status@broadcast"
            },

            message: {
                contactMessage: {
                    displayName: "TEDDY-XMD",

                    vcard:
                        "BEGIN:VCARD\n" +
                        "VERSION:3.0\n" +
                        "FN:TEDDY-XMD\n" +
                        "ORG:TEDDY-XMD;\n" +
                        "TEL;type=CELL;type=VOICE;waid=254799963583:+254799963583\n" +
                        "END:VCARD"
                }
            }
        };

        // ==================================================
        // 8. CLEAN CONTEXT
        // ==================================================
        const cleanContextInfo = {
            forwardingScore: 999,
            isForwarded: true,

            forwardedNewsletterMessageInfo: {
                newsletterJid:
                    config.NEWSLETTER_JID ||
                    "120363421104812135@newsletter",

                newsletterName:
                    config.OWNER_NAME ||
                    "TEDDY-XMD",

                serverMessageId: 1
            }
        };

        // ==================================================
        // 9. GET CONNECTED USER JID
        // ==================================================
        let connectedUserJid = null;

        try {
            if (conn.user?.id) {
                connectedUserJid =
                    conn.user.id.split(":")[0] +
                    "@s.whatsapp.net";
            }
        } catch (e) {
            console.error(
                "CONNECTED USER JID ERROR:",
                e.message
            );
        }

        // ==================================================
        // 10. CREATE MEDIA MESSAGE
        // ==================================================
        const mediaPayload =
            mediaType === "image"
                ? {
                    image: mediaBuffer,
                    caption,
                    contextInfo: cleanContextInfo
                }
                : {
                    video: mediaBuffer,
                    caption,
                    contextInfo: cleanContextInfo
                };

        // ==================================================
        // 11. SEND TO CURRENT CHAT
        // ==================================================
        await conn.sendMessage(
            from,
            mediaPayload,
            {
                quoted: fakeVCard
            }
        );

        // ==================================================
        // 12. SEND INSTANTLY TO CONNECTED USER
        // ==================================================
        if (
            connectedUserJid &&
            connectedUserJid !== from
        ) {
            try {

                await conn.sendMessage(
                    connectedUserJid,
                    mediaPayload,
                    {
                        quoted: fakeVCard
                    }
                );

                console.log(
                    `SAVE: Status sent to connected user ${connectedUserJid}`
                );

            } catch (sendError) {

                console.error(
                    "CONNECTED USER SEND ERROR:",
                    sendError
                );

            }
        }

        // ==================================================
        // 13. SUCCESS REACTION
        // ==================================================
        try {
            await conn.sendMessage(from, {
                react: {
                    text: "✅",
                    key: mek.key
                }
            });
        } catch (e) {}

    } catch (error) {

        console.error(
            "SAVE STATUS ERROR:",
            error
        );

        try {
            await conn.sendMessage(from, {
                react: {
                    text: "❌",
                    key: mek.key
                }
            });
        } catch (e) {}

        return reply(
            "❌ *Failed to save the status.*"
        );
    }
});
