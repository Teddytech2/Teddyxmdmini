/**
 * TEDDY-XMD HideTag
 * Silently tag all group members without listing them
 * Supports text, images, videos, and stickers
 */

const {
    downloadMediaMessage
} = require('xzcbailz');

const { cmd } = require('../inconnuboy');

cmd({
    pattern: "hidetag",
    alias: ["tag"],
    react: "📢",
    desc: "Silently tag all group members",
    category: "group",
    use: ".hidetag <message> or reply to media/message",
    filename: __filename
},

async (
    conn,
    mek,
    m,
    {
        from,
        isGroup,
        q,
        reply
    }
) => {

    try {

        // -----------------------------
        // GROUP ONLY
        // -----------------------------
        if (!isGroup) {
            return reply(
                "❌ *This command can only be used in groups.*"
            );
        }

        // -----------------------------
        // GET GROUP MEMBERS
        // -----------------------------
        const metadata =
            await conn.groupMetadata(from);

        const participants =
            metadata?.participants || [];

        if (!participants.length) {
            return reply(
                "❌ *No group members found.*"
            );
        }

        /*
         * IMPORTANT:
         * Use the original participant JIDs.
         * Do not normalize them before mentions.
         */
        const mentions = participants
            .map(p => p.id || p.jid || p.lid)
            .filter(Boolean);

        // -----------------------------
        // DELETE COMMAND MESSAGE
        // -----------------------------
        try {
            await conn.sendMessage(
                from,
                {
                    delete: mek.key
                }
            );
        } catch (deleteError) {
            console.error(
                "HIDETAG DELETE ERROR:",
                deleteError
            );
        }

        // -----------------------------
        // CHECK QUOTED MESSAGE
        // -----------------------------
        const message =
            mek.message || {};

        const ctxInfo =
            message.extendedTextMessage?.contextInfo;

        let targetMessage = mek;

        if (ctxInfo?.quotedMessage) {

            targetMessage = {
                key: {
                    remoteJid: from,
                    id: ctxInfo.stanzaId,
                    participant: ctxInfo.participant
                },
                message: ctxInfo.quotedMessage
            };
        }

        // -----------------------------
        // DETECT MEDIA
        // -----------------------------
        const target =
            targetMessage.message || {};

        const imageMessage =
            target.imageMessage;

        const videoMessage =
            target.videoMessage;

        const stickerMessage =
            target.stickerMessage;

        const argsText =
            q && q.trim()
                ? q.trim()
                : "";

        // -----------------------------
        // MEDIA HIDETAG
        // -----------------------------
        if (
            imageMessage ||
            videoMessage ||
            stickerMessage
        ) {

            try {

                const mediaBuffer =
                    await downloadMediaMessage(
                        targetMessage,
                        "buffer",
                        {},
                        {
                            logger: undefined,
                            reuploadRequest:
                                conn.updateMediaMessage
                        }
                    );

                // -------------------------
                // IMAGE
                // -------------------------
                if (imageMessage) {

                    const caption =
                        argsText ||
                        imageMessage.caption ||
                        "";

                    await conn.sendMessage(
                        from,
                        {
                            image: mediaBuffer,
                            caption,
                            mentions
                        }
                    );

                    return;
                }

                // -------------------------
                // VIDEO
                // -------------------------
                if (videoMessage) {

                    const caption =
                        argsText ||
                        videoMessage.caption ||
                        "";

                    await conn.sendMessage(
                        from,
                        {
                            video: mediaBuffer,
                            caption,
                            mentions
                        }
                    );

                    return;
                }

                // -------------------------
                // STICKER
                // -------------------------
                if (stickerMessage) {

                    await conn.sendMessage(
                        from,
                        {
                            sticker: mediaBuffer,
                            mentions
                        }
                    );

                    if (argsText) {
                        await conn.sendMessage(
                            from,
                            {
                                text: argsText,
                                mentions
                            }
                        );
                    }

                    return;
                }

            } catch (mediaError) {

                console.error(
                    "❌ HIDETAG MEDIA ERROR:",
                    mediaError
                );

                /*
                 * If media download fails,
                 * still perform a normal
                 * hidden text tag.
                 */
                await conn.sendMessage(
                    from,
                    {
                        text:
                            argsText || " ",
                        mentions
                    }
                );

                return;
            }
        }

        // -----------------------------
        // QUOTED TEXT MESSAGE
        // -----------------------------
        if (ctxInfo?.quotedMessage) {

            const quoted =
                ctxInfo.quotedMessage;

            const quotedText =
                quoted.conversation ||
                quoted.extendedTextMessage?.text ||
                quoted.imageMessage?.caption ||
                quoted.videoMessage?.caption ||
                argsText ||
                " ";

            await conn.sendMessage(
                from,
                {
                    text: quotedText,
                    mentions
                }
            );

            return;
        }

        // -----------------------------
        // NORMAL TEXT HIDETAG
        // -----------------------------
        await conn.sendMessage(
            from,
            {
                text: argsText || " ",
                mentions
            }
        );

    } catch (error) {

        console.error(
            "❌ HIDETAG COMMAND ERROR:",
            error
        );

        return reply(
            "❌ *Failed to tag members.*"
        );
    }
});
