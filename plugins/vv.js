const { cmd } = require('../inconnuboy');
const {
    downloadContentFromMessage
} = require('xzcbailz');

cmd(
{
    pattern: "vv",
    alias: [
        "viewonce",
        "reveal"
    ],
    desc: "Reveal view-once image or video",
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
        reply
    }
) => {

    try {

        const quoted =
            mek.message
                ?.extendedTextMessage
                ?.contextInfo
                ?.quotedMessage;

        if (!quoted) {

            return reply(
                "❌ Reply to a *view-once image or video*."
            );
        }

        // ================= GET VIEW ONCE =================

        const viewOnceMsg =
            quoted.viewOnceMessageV2
            || quoted.viewOnceMessage
            || quoted.viewOnceMessageV2Extension
            || null;

        const mediaContainer =
            viewOnceMsg?.message
            || quoted;

        const mediaType =
            Object.keys(
                mediaContainer
            )[0];

        const mediaMessage =
            mediaContainer[
                mediaType
            ];

        if (!mediaMessage) {

            return reply(
                "❌ Unsupported message type."
            );
        }

        const isImage =
            mediaType === 'imageMessage';

        const isVideo =
            mediaType === 'videoMessage';

        const isAudio =
            mediaType === 'audioMessage';

        if (
            !isImage &&
            !isVideo &&
            !isAudio
        ) {

            return reply(
                "❌ Only image/video/audio supported."
            );
        }

        // ================= CHECK VIEW ONCE =================

        if (
            !mediaMessage.viewOnce &&
            !viewOnceMsg
        ) {

            return reply(
                "❌ This is not a view-once media."
            );
        }

        // ================= REACT =================

        const reactionEmojis = [
            '🔥',
            '⚡',
            '🚀',
            '💨',
            '🎯',
            '🎉',
            '🌟',
            '💥',
            '👁️'
        ];

        const reactEmoji =
            reactionEmojis[
                Math.floor(
                    Math.random()
                    * reactionEmojis.length
                )
            ];

        await conn.sendMessage(
            from,
            {
                react: {
                    text: reactEmoji,
                    key: mek.key
                }
            }
        );

        // ================= DOWNLOAD =================

        const stream =
            await downloadContentFromMessage(
                mediaMessage,
                isImage
                    ? "image"
                    : isVideo
                    ? "video"
                    : "audio"
            );

        let buffer =
            Buffer.from([]);

        for await (
            const chunk of stream
        ) {

            buffer =
                Buffer.concat([
                    buffer,
                    chunk
                ]);
        }

        // ================= SEND =================

        const sendData = {

            caption:
                mediaMessage.caption || '',

            contextInfo: {

                mentionedJid: [sender],

                forwardingScore: 999,

                isForwarded: true,

                forwardedNewsletterMessageInfo: {

                    newsletterJid:
                        "120363421104812135@newsletter",

                    newsletterName:
                        "TEDDY-XMD",

                    serverMessageId: 143
                }
            }
        };

        if (isImage) {

            sendData.image = buffer;

        } else if (isVideo) {

            sendData.video = buffer;

        } else if (isAudio) {

            sendData.audio = buffer;

            sendData.mimetype =
                'audio/mp4';

            sendData.ptt = false;
        }

        await conn.sendMessage(
            from,
            sendData,
            {
                quoted: mek
            }
        );

    } catch (err) {

        console.error(
            "VV Command Error:",
            err
        );

        reply(
            "❌ Failed to reveal view-once media."
        );
    }
});
